from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from database import get_db
from auth import verify_token
from schemas import BillCreate, BillResponse
import uuid
from datetime import datetime

router = APIRouter()


@router.post("/create", response_model=BillResponse)
async def create_bill(
    bill: BillCreate,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    """
    Core billing engine:
    1. Validate stock for all items
    2. Insert sale rows
    3. Deduct stock
    4. Update customer stats
    5. Trigger AI insight generation in background
    """
    bill_id = str(uuid.uuid4())
    total_amount = 0.0

    # ── Step 1: Validate all products exist and have enough stock ──
    for item in bill.items:
        result = db.table("products").select("id, name, stock, price").eq("id", item.product_id).eq("user_id", user_id).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

        product = result.data
        if product["stock"] < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product['name']}'. Available: {product['stock']}, Requested: {item.quantity}"
            )

    # ── Step 2: Insert sale rows + deduct stock ──
    sale_rows = []
    for item in bill.items:
        product = db.table("products").select("stock").eq("id", item.product_id).single().execute().data
        discount_amount = (item.unit_price * item.quantity) * (item.discount / 100)
        line_total = (item.unit_price * item.quantity) - discount_amount
        total_amount += line_total

        sale_rows.append({
            "user_id":      user_id,
            "product_id":   item.product_id,
            "customer_id":  bill.customer_id,
            "bill_id":      bill_id,
            "quantity":     item.quantity,
            "unit_price":   item.unit_price,
            "discount":     item.discount,
            "total_price":  round(line_total, 2),
            "payment_mode": bill.payment_mode,
            "notes":        bill.notes,
            "timestamp":    datetime.utcnow().isoformat()
        })

        # Deduct stock immediately
        new_stock = product["stock"] - item.quantity
        db.table("products").update({"stock": new_stock, "updated_at": datetime.utcnow().isoformat()}).eq("id", item.product_id).execute()

        # Check low stock threshold and create alert
        product_full = db.table("products").select("name, threshold").eq("id", item.product_id).single().execute().data
        if new_stock <= product_full["threshold"]:
            db.table("alerts").insert({
                "user_id":  user_id,
                "type":     "low_stock",
                "title":    f"Low stock: {product_full['name']}",
                "message":  f"'{product_full['name']}' has only {new_stock} units left (threshold: {product_full['threshold']}). Consider restocking.",
                "severity": "warning" if new_stock > 0 else "critical",
                "metadata": {"product_id": item.product_id, "current_stock": new_stock}
            }).execute()

    # Insert all sale rows
    db.table("sales").insert(sale_rows).execute()

    # ── Step 3: Update customer stats ──
    if bill.customer_id:
        cust = db.table("customers").select("total_spent, frequency").eq("id", bill.customer_id).eq("user_id", user_id).single().execute()
        if cust.data:
            db.table("customers").update({
                "total_spent":   round(cust.data["total_spent"] + total_amount, 2),
                "frequency":     cust.data["frequency"] + 1,
                "last_purchase": datetime.utcnow().isoformat(),
                "updated_at":    datetime.utcnow().isoformat()
            }).eq("id", bill.customer_id).execute()

    # ── Step 4: Trigger AI insight in background (non-blocking) ──
    background_tasks.add_task(trigger_post_bill_insight, user_id, db)

    return BillResponse(
        bill_id=bill_id,
        total_amount=round(total_amount, 2),
        items_count=len(bill.items),
        message="Bill created successfully"
    )


@router.get("/history")
async def get_bill_history(
    limit: int = 20,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    """Returns grouped bill history with totals."""
    result = db.table("sales").select(
        "bill_id, total_price, timestamp, payment_mode, customer_id, customers(name)"
    ).eq("user_id", user_id).order("timestamp", desc=True).limit(limit * 5).execute()

    # Group by bill_id
    bills = {}
    for row in (result.data or []):
        bid = row["bill_id"]
        if bid not in bills:
            bills[bid] = {
                "bill_id":      bid,
                "timestamp":    row["timestamp"],
                "payment_mode": row["payment_mode"],
                "customer_name": row.get("customers", {}).get("name") if row.get("customers") else None,
                "total":        0,
                "items":        0
            }
        bills[bid]["total"]  += row["total_price"]
        bills[bid]["items"]  += 1

    return list(bills.values())[:limit]


async def trigger_post_bill_insight(user_id: str, db):
    """Background task: check if anomaly or demand spike after new sale."""
    try:
        from ml.anomaly import detect_anomaly
        detect_anomaly(user_id, db)
    except Exception:
        pass  # Non-critical background task
