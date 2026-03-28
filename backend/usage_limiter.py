from fastapi import HTTPException
from datetime import date

# Limits per day for Free users
FREE_LIMITS = {
    "insights": 1,
    "ai_insights": 3, # Matching your insights.py requirement
    "forecast": 1,
    "health_score": 2,
}

def check_and_increment(user_id: str, feature: str, db):
    """Checks if a user has exceeded their daily limit and increments the count."""
    today = str(date.today())

    # 1. Get user's subscription plan
    try:
        sub = db.table("subscriptions") \
            .select("plan") \
            .eq("user_id", user_id) \
            .maybe_single() \
            .execute()
        
        plan = sub.data["plan"] if sub.data else "free"
    except Exception:
        plan = "free"

    # Premium users bypass all limits
    if plan == "premium":
        return {"used": 0, "limit": "unlimited", "premium": True}

    # 2. Check current usage for today
    res = db.table("usage_logs") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("feature", feature) \
        .eq("date", today) \
        .execute()

    usage = res.data[0] if res.data else None
    limit = FREE_LIMITS.get(feature, 1)

    # 3. Check if limit is already reached
    if usage and usage["count"] >= limit:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Daily limit reached",
                "upgrade_required": True,
                "feature": feature
            }
        )

    # 4. Increment or Insert usage
    used_count = 1
    if usage:
        used_count = usage["count"] + 1
        db.table("usage_logs") \
            .update({"count": used_count}) \
            .eq("id", usage["id"]) \
            .execute()
    else:
        db.table("usage_logs") \
            .insert({
                "user_id": user_id,
                "feature": feature,
                "count": 1,
                "date": today
            }) \
            .execute()

    return {"used": used_count, "limit": limit}

def get_usage_status(user_id: str, db):
    """
    REQUIRED BY INSIGHTS.PY
    Returns today's usage stats for the frontend dashboard.
    """
    today = str(date.today())
    
    res = db.table("usage_logs") \
        .select("feature, count") \
        .eq("user_id", user_id) \
        .eq("date", today) \
        .execute()
    
    # Create a clean dictionary of current usage
    current_usage = {item["feature"]: item["count"] for item in (res.data or [])}
    
    status = {}
    for feature, limit in FREE_LIMITS.items():
        used = current_usage.get(feature, 0)
        status[feature] = {
            "used": used,
            "limit": limit,
            "remaining": max(0, limit - used)
        }
    
    return status