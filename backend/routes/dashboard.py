from fastapi import APIRouter, Depends
from database import get_db

router = APIRouter()


@router.get("")
async def get_dashboard(db=Depends(get_db)):
    """
    Returns full dashboard data using the Supabase SQL function.
    """
    user_id = "demo-user"

    try:
        result = db.rpc("get_dashboard_summary", {"p_user_id": user_id}).execute()
        summary = result.data or {}

        sub = db.table("subscriptions") \
            .select("plan, status, expiry") \
            .eq("user_id", user_id) \
            .single() \
            .execute()

        summary["subscription"] = sub.data or {
            "plan": "free",
            "status": "active"
        }

        return summary

    except Exception as e:
        print("Dashboard error:", e)
        return {
            "sales": 0,
            "revenue": 0,
            "customers": 0,
            "products": 0,
            "subscription": {"plan": "free", "status": "active"}
        }


@router.get("/predict-demand")
async def predict_demand(days: int = 7, db=Depends(get_db)):
    user_id = "demo-user"

    try:
        sub = db.table("subscriptions") \
            .select("plan") \
            .eq("user_id", user_id) \
            .single() \
            .execute()

        if not sub.data or sub.data.get("plan") != "premium":
            return {
                "error": "Upgrade to Premium",
                "upgrade_required": True
            }

        from ml.forecasting import forecast_demand
        forecasts = forecast_demand(user_id, db, days=days)
        return forecasts

    except Exception as e:
        print("Forecast error:", e)
        return {
            "error": "Forecast unavailable",
            "data": []
        }


@router.get("/health-score")
async def get_health_score(db=Depends(get_db)):
    user_id = "demo-user"

    try:
        from ml.health_score import compute_health_score
        score = compute_health_score(user_id, db)
        return score

    except Exception as e:
        print("Health score error:", e)

        return {
            "score": 75,
            "status": "good",
            "message": "Default health score (fallback)"
        }