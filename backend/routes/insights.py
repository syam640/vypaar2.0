from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from database import get_db
from auth import verify_token
from schemas import InsightRequest
import os, json
from datetime import datetime
from openai import OpenAI

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def build_insight_prompt(insight_type: str, context: dict) -> str:
    base = f"""You are Vyapaar AI Copilot, a smart business advisor for small Indian businesses.

Business context:
- Sales today: ₹{context.get('total_sales_today', 0)}
- Sales this month: ₹{context.get('total_sales_month', 0)}
- Orders today: {context.get('total_orders_today', 0)}
- Total customers: {context.get('total_customers', 0)}
- Low stock products: {context.get('low_stock_count', 0)}
- Unread alerts: {context.get('unread_alerts', 0)}
- Top products: {json.dumps(context.get('top_products', []))}
- Sales last 7 days: {json.dumps(context.get('sales_last_7_days', []))}
- Customer segments: {json.dumps(context.get('segments', {}))}
"""

    prompts = {
        "daily": base + """
Generate a daily business insight report in this exact JSON format:
{
  "title": "short title",
  "summary": "2-3 sentence overview of today's business performance",
  "highlights": ["positive insight 1", "positive insight 2"],
  "warnings": ["concern 1 if any"],
  "action_items": ["specific action 1", "specific action 2", "specific action 3"],
  "tomorrow_focus": "one key thing to focus on tomorrow"
}
Respond ONLY with valid JSON. Be specific, practical, and use Indian business context.""",

        "demand": base + """
Analyze the sales trend and generate demand forecast insights in JSON:
{
  "title": "Demand Forecast Insights",
  "trending_up": ["products likely to sell more"],
  "trending_down": ["products selling less"],
  "restock_urgently": ["product names that need urgent restock"],
  "action_items": ["action 1", "action 2"],
  "summary": "2-sentence demand summary"
}
Respond ONLY with valid JSON.""",

        "customer": base + """
Analyze customer data and generate retention insights in JSON:
{
  "title": "Customer Intelligence Report",
  "loyal_customers_tip": "what to do for loyal customers",
  "at_risk_customers_tip": "how to re-engage at-risk customers",
  "new_customers_tip": "how to convert new customers to loyal",
  "action_items": ["action 1", "action 2", "action 3"],
  "summary": "2-sentence customer health summary"
}
Respond ONLY with valid JSON.""",

        "inventory": base + """
Analyze inventory and generate stock management insights in JSON:
{
  "title": "Inventory Health Report",
  "critical_items": ["items at 0 or near-0 stock"],
  "overstock_items": ["items with very high stock"],
  "reorder_suggestions": [{"product": "name", "suggested_qty": 100}],
  "action_items": ["action 1", "action 2"],
  "summary": "2-sentence inventory summary"
}
Respond ONLY with valid JSON."""
    }

    return prompts.get(insight_type, prompts["daily"])


@router.post("/generate")
async def generate_insight(
    req: InsightRequest,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    """Generates AI insight using LLM based on real business data."""

    # Check premium
    sub = db.table("subscriptions").select("plan").eq("user_id", user_id).single().execute()
    if not sub.data or sub.data["plan"] != "premium":
        return {"error": "Upgrade to Premium to access AI Insights", "upgrade_required": True}

    # Gather context
    dashboard = db.rpc("get_dashboard_summary", {"p_user_id": user_id}).execute().data or {}

    segments_result = db.table("customers").select("segment").eq("user_id", user_id).execute()
    segment_counts = {}
    for c in (segments_result.data or []):
        s = c["segment"]
        segment_counts[s] = segment_counts.get(s, 0) + 1
    dashboard["segments"] = segment_counts

    prompt = build_insight_prompt(req.type, dashboard)

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=800
        )
        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        insight_data = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    # Store insight in DB
    stored = db.table("insights").insert({
        "user_id":      user_id,
        "type":         req.type,
        "title":        insight_data.get("title", "AI Insight"),
        "content":      json.dumps(insight_data),
        "action_items": insight_data.get("action_items", []),
        "model_used":   "gpt-4o-mini",
        "input_data":   dashboard,
        "created_at":   datetime.utcnow().isoformat()
    }).execute()

    return {
        "insight": insight_data,
        "id": stored.data[0]["id"] if stored.data else None,
        "generated_at": datetime.utcnow().isoformat()
    }


@router.get("")
async def get_insights(
    limit: int = 10,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    result = db.table("insights").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
    return result.data or []


@router.put("/{insight_id}/read")
async def mark_insight_read(
    insight_id: str,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    db.table("insights").update({"is_read": True}).eq("id", insight_id).eq("user_id", user_id).execute()
    return {"message": "Marked as read"}
