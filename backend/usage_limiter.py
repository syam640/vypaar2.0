"""
usage_limiter.py
----------------
Reusable freemium usage tracking + enforcement for Vyapaar AI Copilot.

Usage:
    from usage_limiter import check_and_increment, get_usage_status

    # In a route — raises HTTP 429 automatically if limit hit
    await check_and_increment(user_id, "ai_insights", db)
"""

from fastapi import HTTPException
from datetime import date
from typing import Literal

# ── Feature limits (free tier) ────────────────────────────────────────────────
Feature = Literal["ai_insights", "forecast", "health_score"]

FREE_LIMITS: dict[str, int] = {
    "ai_insights":  3,
    "forecast":     1,
    "health_score": 2,
}

FEATURE_LABELS: dict[str, str] = {
    "ai_insights":  "AI Insights",
    "forecast":     "Demand Forecast",
    "health_score": "Health Score",
}


# ── Core function ─────────────────────────────────────────────────────────────

def check_and_increment(user_id: str, feature: Feature, db) -> dict:
    """
    1. Checks if user is premium → unlimited, skip tracking.
    2. Gets (or creates) today's usage row for this feature.
    3. If at limit → raises HTTP 429 with structured JSON.
    4. If under limit → increments count and returns usage info.

    Returns:
        {
            "allowed": True,
            "used": 2,
            "limit": 3,
            "remaining": 1,
            "is_premium": False
        }
    """
    today = date.today().isoformat()

    # ── Step 1: check plan ────────────────────────────────────────────────────
    sub = (
        db.table("subscriptions")
        .select("plan, status")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    is_premium = (
        sub.data is not None
        and sub.data.get("plan") == "premium"
        and sub.data.get("status") == "active"
    )

    if is_premium:
        return {
            "allowed":    True,
            "used":       0,
            "limit":      None,
            "remaining":  None,
            "is_premium": True,
        }

    # ── Step 2: get or create today's usage row ───────────────────────────────
    limit = FREE_LIMITS[feature]

    existing = (
        db.table("usage_limits")
        .select("id, count")
        .eq("user_id",    user_id)
        .eq("feature",    feature)
        .eq("usage_date", today)
        .execute()
    )

    if existing.data:
        row       = existing.data[0]
        current   = row["count"]
        row_id    = row["id"]
    else:
        # Create fresh row for today
        insert = (
            db.table("usage_limits")
            .insert({
                "user_id":    user_id,
                "feature":    feature,
                "usage_date": today,
                "count":      0,
            })
            .execute()
        )
        row_id  = insert.data[0]["id"]
        current = 0

    # ── Step 3: enforce limit ─────────────────────────────────────────────────
    if current >= limit:
        label = FEATURE_LABELS.get(feature, feature)
        raise HTTPException(
            status_code=429,
            detail={
                "error":            f"Daily limit reached for {label}",
                "feature":          feature,
                "limit":            limit,
                "used":             current,
                "remaining":        0,
                "upgrade_required": True,
                "reset":            "Resets at midnight",
            }
        )

    # ── Step 4: increment ─────────────────────────────────────────────────────
    db.table("usage_limits").update({"count": current + 1}).eq("id", row_id).execute()

    remaining = limit - (current + 1)
    return {
        "allowed":    True,
        "used":       current + 1,
        "limit":      limit,
        "remaining":  remaining,
        "is_premium": False,
    }


def get_usage_status(user_id: str, db) -> dict:
    """
    Returns today's usage across all features for a user.
    Useful for showing usage meter in the frontend.

    Returns:
        {
            "is_premium": false,
            "usage": {
                "ai_insights":  { "used": 2, "limit": 3, "remaining": 1 },
                "forecast":     { "used": 0, "limit": 1, "remaining": 1 },
                "health_score": { "used": 1, "limit": 2, "remaining": 1 }
            }
        }
    """
    today = date.today().isoformat()

    # Check plan
    sub = (
        db.table("subscriptions")
        .select("plan, status")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    is_premium = (
        sub.data is not None
        and sub.data.get("plan") == "premium"
        and sub.data.get("status") == "active"
    )

    # Fetch today's rows
    rows = (
        db.table("usage_limits")
        .select("feature, count")
        .eq("user_id",    user_id)
        .eq("usage_date", today)
        .execute()
    )
    usage_map = {r["feature"]: r["count"] for r in (rows.data or [])}

    result = {}
    for feature, limit in FREE_LIMITS.items():
        used = usage_map.get(feature, 0)
        result[feature] = {
            "used":      used,
            "limit":     None if is_premium else limit,
            "remaining": None if is_premium else max(0, limit - used),
        }

    return {"is_premium": is_premium, "usage": result}
