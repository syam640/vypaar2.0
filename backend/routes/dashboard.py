from fastapi import APIRouter, Depends
from database import get_db

router = APIRouter()


@router.get("")
async def get_dashboard(db=Depends(get_db)):
    """
    Returns full dashboard data using the Supabase SQL function.
    """
    # TEMP: static user_id (replace later with real auth)
    user_id = "demo-user"

    result = db.rpc("get_dashboard_summary", {"p_user_id": user_id}).execute()
    summary = result.data or {}

    # Append plan info
    sub = db.table("subscriptions").select("plan, status, expiry").eq("user_id", user_id).single().execute()
    summary["subscription"] = sub.data or {"plan": "free", "status": "active"}

    return summary


@router.get("/predict-demand")
async def predict_demand(days: int = 7, db=Depends(get_db)):
    user_id = "demo-user"

    sub = db.table("subscriptions").select("plan").eq("user_id", user_id).single().execute()
    if not sub.data or sub.data["plan"] != "premium":
        return {"error": "Upgrade to Premium to access demand forecasting", "upgrade_required": True}

    from ml.forecasting import forecast_demand
    forecasts = forecast_demand(user_id, db, days=days)
    return forecasts


@router.get("/health-score")
async def get_health_score(db=Depends(get_db)):
    user_id = "demo-user"

    from ml.health_score import compute_health_score
    score = compute_health_score(user_id, db)
    return score