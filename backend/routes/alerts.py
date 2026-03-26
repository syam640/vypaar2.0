from fastapi import APIRouter, Depends
from database import get_db
from auth import verify_token

router = APIRouter()


@router.get("")
async def get_alerts(
    unread_only: bool = False,
    limit: int = 50,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    query = db.table("alerts").select("*").eq("user_id", user_id)
    if unread_only:
        query = query.eq("is_read", False)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return result.data or []


@router.put("/{alert_id}/read")
async def mark_alert_read(
    alert_id: str,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    db.table("alerts").update({"is_read": True}).eq("id", alert_id).eq("user_id", user_id).execute()
    return {"message": "Alert marked as read"}


@router.put("/read-all")
async def mark_all_read(
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    db.table("alerts").update({"is_read": True}).eq("user_id", user_id).eq("is_read", False).execute()
    return {"message": "All alerts marked as read"}
