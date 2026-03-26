from datetime import datetime, timedelta
import pandas as pd
import numpy as np

# ── Anomaly Detection ─────────────────────────────────────────────────────────

def detect_anomaly(user_id: str, db) -> list:
    """
    Detects sudden spikes or drops in daily sales using Z-score method.
    Triggers alerts if anomaly found.
    """
    cutoff = (datetime.utcnow() - timedelta(days=30)).isoformat()
    result = db.table("sales").select("total_price, timestamp").eq("user_id", user_id).gte("timestamp", cutoff).execute()

    rows = result.data or []
    if len(rows) < 7:
        return []

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["timestamp"]).dt.date
    daily = df.groupby("date")["total_price"].sum().reset_index()
    daily.columns = ["date", "total"]

    if len(daily) < 5:
        return []

    mean   = daily["total"].mean()
    std    = daily["total"].std()
    today  = daily.iloc[-1]

    if std == 0:
        return []

    z_score = (today["total"] - mean) / std
    alerts  = []

    if z_score > 2.0:
        msg = f"Sales spike detected! Today's sales (₹{today['total']:.0f}) are significantly above your average (₹{mean:.0f})."
        db.table("alerts").insert({
            "user_id":  user_id,
            "type":     "demand_spike",
            "title":    "Sales spike today",
            "message":  msg,
            "severity": "info",
            "metadata": {"z_score": round(z_score, 2), "today": float(today["total"]), "mean": float(mean)}
        }).execute()
        alerts.append({"type": "spike", "z_score": z_score})

    elif z_score < -2.0:
        msg = f"Sales drop detected! Today's sales (₹{today['total']:.0f}) are significantly below your average (₹{mean:.0f}). Investigate potential causes."
        db.table("alerts").insert({
            "user_id":  user_id,
            "type":     "demand_drop",
            "title":    "Sales drop today",
            "message":  msg,
            "severity": "warning",
            "metadata": {"z_score": round(z_score, 2), "today": float(today["total"]), "mean": float(mean)}
        }).execute()
        alerts.append({"type": "drop", "z_score": z_score})

    return alerts


# ── Business Health Score ─────────────────────────────────────────────────────

def compute_health_score(user_id: str, db) -> dict:
    """
    Returns a 0-100 business health score with breakdown.
    """
    scores = {}

    # 1. Sales trend (30%) — compare last 7 days vs previous 7 days
    cutoff_14 = (datetime.utcnow() - timedelta(days=14)).isoformat()
    sales_res = db.table("sales").select("total_price, timestamp").eq("user_id", user_id).gte("timestamp", cutoff_14).execute()
    sales_df  = pd.DataFrame(sales_res.data or [])

    if not sales_df.empty:
        sales_df["date"] = pd.to_datetime(sales_df["timestamp"]).dt.date
        midpoint         = datetime.utcnow().date() - timedelta(days=7)
        recent   = sales_df[sales_df["date"] >= midpoint]["total_price"].sum()
        previous = sales_df[sales_df["date"] < midpoint]["total_price"].sum()
        if previous == 0:
            trend_score = 50
        else:
            change = (recent - previous) / previous * 100
            trend_score = min(100, max(0, 50 + change))
    else:
        trend_score = 20

    scores["sales_trend"] = round(trend_score)

    # 2. Inventory health (25%) — penalise for low stock items
    prod_res    = db.table("products").select("stock, threshold").eq("user_id", user_id).eq("is_active", True).execute()
    products    = prod_res.data or []
    if products:
        low_count   = sum(1 for p in products if p["stock"] <= p["threshold"])
        inv_score   = 100 - (low_count / len(products) * 100)
    else:
        inv_score   = 50
    scores["inventory_health"] = round(inv_score)

    # 3. Customer retention (25%) — loyal / (total)
    cust_res = db.table("customers").select("segment").eq("user_id", user_id).execute()
    customers = cust_res.data or []
    if customers:
        loyal = sum(1 for c in customers if c["segment"] == "loyal")
        ret_score = (loyal / len(customers)) * 100
    else:
        ret_score = 30
    scores["customer_retention"] = round(ret_score)

    # 4. Activity score (20%) — orders in last 7 days
    cutoff_7 = (datetime.utcnow() - timedelta(days=7)).isoformat()
    orders_res = db.table("sales").select("bill_id").eq("user_id", user_id).gte("timestamp", cutoff_7).execute()
    order_count = len(set(r["bill_id"] for r in (orders_res.data or [])))
    activity_score = min(100, order_count * 10)  # 10 orders/week = 100
    scores["activity"] = round(activity_score)

    # Weighted total
    total = (
        scores["sales_trend"]        * 0.30 +
        scores["inventory_health"]   * 0.25 +
        scores["customer_retention"] * 0.25 +
        scores["activity"]           * 0.20
    )

    label = "Excellent" if total >= 80 else "Good" if total >= 60 else "Needs Attention" if total >= 40 else "Critical"

    return {
        "total_score":  round(total),
        "label":        label,
        "breakdown":    scores,
        "computed_at":  datetime.utcnow().isoformat()
    }
