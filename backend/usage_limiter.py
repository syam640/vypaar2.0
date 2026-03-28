from fastapi import HTTPException
from datetime import date

# Limits per day
FREE_LIMITS = {
    "insights": 1,
    "forecast": 1,
    "health_score": 2,
}

def check_and_increment(user_id: str, feature: str, db):
    today = str(date.today())

    # Check current usage
    res = db.table("usage_logs") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("feature", feature) \
        .eq("date", today) \
        .execute()

    usage = res.data[0] if res.data else None

    # Get subscription
    sub = db.table("subscriptions") \
        .select("plan") \
        .eq("user_id", user_id) \
        .single() \
        .execute()

    plan = sub.data["plan"] if sub.data else "free"

    # Premium → no limit
    if plan == "premium":
        return {"used": 0, "limit": "unlimited"}

    limit = FREE_LIMITS.get(feature, 1)

    if usage and usage["count"] >= limit:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Daily limit reached",
                "upgrade_required": True
            }
        )

    # Increment usage
    if usage:
        db.table("usage_logs") \
            .update({"count": usage["count"] + 1}) \
            .eq("id", usage["id"]) \
            .execute()
        used = usage["count"] + 1
    else:
        db.table("usage_logs") \
            .insert({
                "user_id": user_id,
                "feature": feature,
                "count": 1,
                "date": today
            }) \
            .execute()
        used = 1

    return {"used": used, "limit": limit}