from fastapi import APIRouter, Depends
from database import get_db
from usage_limiter import check_and_increment
from auth import verify_token    

router = APIRouter()

@router.get("")
async def get_dashboard(
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    try:
        # Fetch summary using the SQL function we created in Supabase
        result = db.rpc("get_dashboard_summary", {"p_user_id": user_id}).execute()
        summary = result.data or {}

        # Fetch subscription info
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
            "total_sales_today": 0,
            "total_sales_month": 0,
            "total_orders_today": 0,
            "total_customers": 0,
            "total_products": 0,
            "subscription": {"plan": "free", "status": "active"}
        }

@router.get("/predict-demand")
async def predict_demand(
    days: int = 7,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    try:
        # 🔥 LIMIT CHECK: (1/day for free)
        usage = check_and_increment(user_id, "forecast", db)

        from ml.forecasting import forecast_demand
        result = forecast_demand(user_id, db, days=days)
        
        result["usage"] = usage
        return result

    except Exception as e:
        # If limit reached, it raises an HTTPException(402) which is caught by FastAPI
        raise e 

@router.get("/health-score")
async def get_health_score(
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    try:
        # 🔥 LIMIT CHECK: (2/day for free)
        usage = check_and_increment(user_id, "health_score", db)

        from ml.health_score import compute_health_score
        result = compute_health_score(user_id, db)
        
        result["usage"] = usage
        return result

    except Exception as e:
        raise e