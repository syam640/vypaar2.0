from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import verify_token
from schemas import CustomerCreate, CustomerUpdate
from datetime import datetime

router = APIRouter()


@router.get("")
async def get_customers(
    segment: str = None,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    query = db.table("customers").select("*").eq("user_id", user_id)

    if segment:
        query = query.eq("segment", segment)

    result = query.order("total_spent", desc=True).execute()
    return result.data or []


@router.post("/add")
async def add_customer(
    customer: CustomerCreate,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    data = {**customer.model_dump(), "user_id": user_id}
    result = db.table("customers").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create customer")
    return result.data[0]


@router.put("/{customer_id}")
async def update_customer(
    customer_id: str,
    updates: CustomerUpdate,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    existing = db.table("customers").select("id").eq("id", customer_id).eq("user_id", user_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Customer not found")

    data = {k: v for k, v in updates.model_dump().items() if v is not None}
    data["updated_at"] = datetime.utcnow().isoformat()

    result = db.table("customers").update(data).eq("id", customer_id).execute()
    return result.data[0]


@router.get("/segments")
async def get_customer_segments(
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    """Returns RFM-based customer segment breakdown."""
    from ml.segmentation import compute_rfm_segments
    segments = compute_rfm_segments(user_id, db)
    return segments


@router.get("/{customer_id}/history")
async def get_customer_history(
    customer_id: str,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    result = db.table("sales").select(
        "bill_id, total_price, timestamp, payment_mode, products(name)"
    ).eq("user_id", user_id).eq("customer_id", customer_id).order("timestamp", desc=True).limit(50).execute()

    return result.data or []
