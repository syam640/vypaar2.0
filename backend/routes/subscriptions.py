from fastapi import APIRouter, Depends, HTTPException, Request
from database import get_db
from auth import verify_token
import os, hmac, hashlib, razorpay
from datetime import datetime, timedelta

router = APIRouter()
rzp_client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))

PREMIUM_PLAN_ID = os.getenv("RAZORPAY_PLAN_ID")  # Set this in Razorpay dashboard


@router.get("/status")
async def get_subscription_status(
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    result = db.table("subscriptions").select("*").eq("user_id", user_id).single().execute()
    return result.data or {"plan": "free", "status": "active"}


@router.post("/create-order")
async def create_subscription_order(
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    """Creates a Razorpay subscription order for premium plan."""
    try:
        subscription = rzp_client.subscription.create({
            "plan_id":        PREMIUM_PLAN_ID,
            "total_count":    12,          # 12 months
            "quantity":       1,
            "customer_notify": 1,
            "notes":          {"user_id": user_id}
        })
        return {
            "subscription_id": subscription["id"],
            "key_id":          os.getenv("RAZORPAY_KEY_ID")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not create order: {str(e)}")


@router.post("/verify")
async def verify_payment(
    payload: dict,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    """Verifies Razorpay payment signature and upgrades user to premium."""
    expected_signature = hmac.new(
        os.getenv("RAZORPAY_KEY_SECRET").encode(),
        f"{payload['razorpay_payment_id']}|{payload['razorpay_subscription_id']}".encode(),
        hashlib.sha256
    ).hexdigest()

    if expected_signature != payload.get("razorpay_signature"):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    expiry = datetime.utcnow() + timedelta(days=30)

    db.table("subscriptions").update({
        "plan":                 "premium",
        "status":               "active",
        "razorpay_sub_id":      payload["razorpay_subscription_id"],
        "expiry":               expiry.isoformat(),
        "updated_at":           datetime.utcnow().isoformat()
    }).eq("user_id", user_id).execute()

    db.table("users").update({"plan": "premium"}).eq("id", user_id).execute()

    return {"message": "Upgraded to Premium!", "expiry": expiry.isoformat()}


@router.post("/webhook")
async def razorpay_webhook(request: Request, db=Depends(get_db)):
    """Handles Razorpay subscription lifecycle webhooks."""
    body      = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    secret    = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if expected != signature:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event = await request.json()
    event_type = event.get("event")

    if event_type == "subscription.charged":
        sub_id = event["payload"]["subscription"]["entity"]["id"]
        notes  = event["payload"]["subscription"]["entity"].get("notes", {})
        user_id = notes.get("user_id")
        if user_id:
            expiry = datetime.utcnow() + timedelta(days=30)
            db.table("subscriptions").update({
                "plan":    "premium",
                "status":  "active",
                "expiry":  expiry.isoformat()
            }).eq("user_id", user_id).execute()

    elif event_type in ("subscription.cancelled", "subscription.expired"):
        sub_id  = event["payload"]["subscription"]["entity"]["id"]
        db_sub  = db.table("subscriptions").select("user_id").eq("razorpay_sub_id", sub_id).single().execute()
        if db_sub.data:
            uid = db_sub.data["user_id"]
            db.table("subscriptions").update({"plan": "free", "status": "expired"}).eq("user_id", uid).execute()
            db.table("users").update({"plan": "free"}).eq("id", uid).execute()

    return {"received": True}
