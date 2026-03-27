from fastapi import APIRouter, Depends
from database import get_db
from usage_limiter import check_and_increment

router = APIRouter()


@router.get("")
async def get_dashboard(db=Depends(get_db)):
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
        # 🔥 usage limit (1/day for free)
        usage = check_and_increment(user_id, "forecast", db)

        from ml.forecasting import forecast_demand
        result = forecast_demand(user_id, db, days=days)
        result["usage"] = usage
        return result

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
        # 🔥 usage limit (2/day for free)
        usage = check_and_increment(user_id, "health_score", db)

        from ml.health_score import compute_health_score
        result = compute_health_score(user_id, db)
        result["usage"] = usage
        return result

    except Exception as e:
        print("Health score error:", e)
        return {
            "score": 75,
            "status": "good",
            "message": "Default health score",
            "usage": {"remaining": 1}
        }