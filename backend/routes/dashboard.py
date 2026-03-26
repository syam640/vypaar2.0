from fastapi import APIRouter, Depends
from database import get_db
from auth import verify_token

router = APIRouter()


@router.get("")
async def get_dashboard(
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    """
    Returns full dashboard data using the Supabase SQL function.
    """
    result = db.rpc("get_dashboard_summary", {"p_user_id": user_id}).execute()
    summary = result.data or {}

    # Append plan info
    sub = db.table("subscriptions").select("plan, status, expiry").eq("user_id", user_id).single().execute()
    summary["subscription"] = sub.data or {"plan": "free", "status": "active"}

    return summary


@router.get("/predict-demand")
async def predict_demand(
    days: int = 7,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    """
    Returns demand forecast for next N days per product.
    Requires premium plan.
    """
    sub = db.table("subscriptions").select("plan").eq("user_id", user_id).single().execute()
    if not sub.data or sub.data["plan"] != "premium":
        return {"error": "Upgrade to Premium to access demand forecasting", "upgrade_required": True}

    from ml.forecasting import forecast_demand
    forecasts = forecast_demand(user_id, db, days=days)
    return forecasts


@router.get("/health-score")
async def get_health_score(
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    """
    Computes a 0-100 business health score based on:
    - Sales trend (30%)
    - Inventory health (25%)
    - Customer retention (25%)
    - Profit margin proxy (20%)
    """
    from ml.health_score import compute_health_score
    score = compute_health_score(user_id, db)
    return score
