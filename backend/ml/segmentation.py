from datetime import datetime, timedelta
import pandas as pd
import numpy as np

def compute_rfm_segments(user_id: str, db) -> dict:
    """
    Computes RFM (Recency, Frequency, Monetary) scores per customer.
    Segments customers into: loyal, at_risk, new, lost
    """
    result = db.table("sales").select(
        "customer_id, total_price, timestamp"
    ).eq("user_id", user_id).not_.is_("customer_id", "null").execute()

    rows = result.data or []
    if not rows:
        return {"segments": {}, "customers": [], "message": "No customer sales data found"}

    df = pd.DataFrame(rows)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    now = datetime.utcnow()

    rfm = df.groupby("customer_id").agg(
        recency=("timestamp",   lambda x: (now - x.max()).days),
        frequency=("customer_id", "count"),
        monetary=("total_price",  "sum")
    ).reset_index()

    # Score each metric 1-4
    def score_col(series, ascending=True):
        try:
            labels = [1, 2, 3, 4]
            if not ascending:
                labels = [4, 3, 2, 1]
            return pd.qcut(series, q=4, labels=labels, duplicates="drop").astype(float)
        except Exception:
            return pd.Series([2.0] * len(series))

    rfm["r_score"] = score_col(rfm["recency"],   ascending=False)  # Lower recency = better
    rfm["f_score"] = score_col(rfm["frequency"], ascending=True)
    rfm["m_score"] = score_col(rfm["monetary"],  ascending=True)
    rfm["rfm_score"] = rfm["r_score"] + rfm["f_score"] + rfm["m_score"]

    def assign_segment(row):
        if row["rfm_score"] >= 10:
            return "loyal"
        elif row["rfm_score"] >= 7:
            return "at_risk" if row["r_score"] <= 2 else "loyal"
        elif row["recency"] > 60:
            return "lost"
        else:
            return "new"

    rfm["segment"] = rfm.apply(assign_segment, axis=1)

    # Update each customer's segment in DB
    for _, row in rfm.iterrows():
        db.table("customers").update({
            "segment":     row["segment"],
            "rfm_score":   round(float(row["rfm_score"]), 2),
            "updated_at":  datetime.utcnow().isoformat()
        }).eq("id", row["customer_id"]).execute()

        # Alert for at_risk customers
        if row["segment"] == "at_risk":
            cust = db.table("customers").select("name").eq("id", row["customer_id"]).single().execute()
            name = cust.data["name"] if cust.data else "A customer"
            db.table("alerts").insert({
                "user_id":  user_id,
                "type":     "customer_inactive",
                "title":    f"At-risk customer: {name}",
                "message":  f"{name} hasn't purchased recently. Consider reaching out.",
                "severity": "warning",
                "metadata": {"customer_id": row["customer_id"]}
            }).execute()

    segment_counts = rfm["segment"].value_counts().to_dict()

    return {
        "segment_counts": segment_counts,
        "customers": rfm[["customer_id", "recency", "frequency", "monetary", "rfm_score", "segment"]].to_dict("records"),
        "computed_at": datetime.utcnow().isoformat()
    }
