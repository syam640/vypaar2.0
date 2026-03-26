from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import verify_token
from schemas import ProductCreate, ProductUpdate
from datetime import datetime

router = APIRouter()


@router.get("")
async def get_products(
    category: str = None,
    low_stock_only: bool = False,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    query = db.table("products").select("*").eq("user_id", user_id).eq("is_active", True)

    if category:
        query = query.eq("category", category)

    result = query.order("name").execute()
    products = result.data or []

    if low_stock_only:
        products = [p for p in products if p["stock"] <= p["threshold"]]

    return products


@router.post("/add")
async def add_product(
    product: ProductCreate,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    data = {**product.model_dump(), "user_id": user_id}
    result = db.table("products").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create product")

    return result.data[0]


@router.put("/{product_id}")
async def update_product(
    product_id: str,
    updates: ProductUpdate,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    existing = db.table("products").select("id").eq("id", product_id).eq("user_id", user_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Product not found")

    data = {k: v for k, v in updates.model_dump().items() if v is not None}
    data["updated_at"] = datetime.utcnow().isoformat()

    result = db.table("products").update(data).eq("id", product_id).execute()
    return result.data[0]


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    existing = db.table("products").select("id").eq("id", product_id).eq("user_id", user_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Product not found")

    # Soft delete
    db.table("products").update({"is_active": False}).eq("id", product_id).execute()
    return {"message": "Product deleted"}


@router.get("/categories")
async def get_categories(
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    result = db.table("products").select("category").eq("user_id", user_id).execute()
    categories = list(set(p["category"] for p in (result.data or [])))
    return sorted(categories)
