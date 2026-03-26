from datetime import datetime, timedelta
import pandas as pd

def forecast_demand(user_id: str, db, days: int = 7) -> dict:
    """
    Forecasts demand per product using Prophet.
    Falls back to simple moving average if Prophet unavailable or data is insufficient.
    """
    # Fetch last 90 days of sales grouped by product + day
    cutoff = (datetime.utcnow() - timedelta(days=90)).isoformat()
    result = db.table("sales").select(
        "product_id, quantity, timestamp, products(name)"
    ).eq("user_id", user_id).gte("timestamp", cutoff).execute()

    rows = result.data or []
    if not rows:
        return {"forecasts": [], "message": "Not enough sales data for forecasting"}

    # Build a DataFrame
    df = pd.DataFrame([{
        "product_id":   r["product_id"],
        "product_name": r["products"]["name"] if r.get("products") else "Unknown",
        "qty":          r["quantity"],
        "date":         r["timestamp"][:10]
    } for r in rows])

    df["date"] = pd.to_datetime(df["date"])

    forecasts = []
    for product_id, group in df.groupby("product_id"):
        product_name = group["product_name"].iloc[0]
        daily = group.groupby("date")["qty"].sum().reset_index()
        daily.columns = ["ds", "y"]

        if len(daily) < 5:
            # Not enough data — use average
            avg = daily["y"].mean()
            future_dates = [datetime.utcnow().date() + timedelta(days=i) for i in range(1, days + 1)]
            pred = [{"date": str(d), "predicted_qty": round(avg, 1)} for d in future_dates]
            forecasts.append({
                "product_id":   product_id,
                "product_name": product_name,
                "method":       "average",
                "predictions":  pred
            })
            continue

        try:
            from prophet import Prophet
            model = Prophet(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=False)
            model.fit(daily)
            future = model.make_future_dataframe(periods=days)
            forecast = model.predict(future)
            future_only = forecast.tail(days)[["ds", "yhat"]].copy()
            future_only["yhat"] = future_only["yhat"].clip(lower=0).round(1)
            pred = [{"date": str(row["ds"].date()), "predicted_qty": row["yhat"]} for _, row in future_only.iterrows()]
            method = "prophet"
        except ImportError:
            # Prophet not installed — rolling average fallback
            rolling_avg = daily["y"].rolling(7, min_periods=1).mean().iloc[-1]
            future_dates = [datetime.utcnow().date() + timedelta(days=i) for i in range(1, days + 1)]
            pred = [{"date": str(d), "predicted_qty": round(float(rolling_avg), 1)} for d in future_dates]
            method = "rolling_average"

        # Save forecast to DB
        for p in pred:
            db.table("demand_forecasts").upsert({
                "user_id":        user_id,
                "product_id":     product_id,
                "forecast_date":  p["date"],
                "predicted_qty":  p["predicted_qty"],
                "model_used":     method,
                "created_at":     datetime.utcnow().isoformat()
            }).execute()

        forecasts.append({
            "product_id":   product_id,
            "product_name": product_name,
            "method":       method,
            "predictions":  pred
        })

    return {"forecasts": forecasts, "generated_at": datetime.utcnow().isoformat()}
