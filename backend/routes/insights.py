from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import verify_token
from schemas import InsightRequest
from usage_limiter import check_and_increment, get_usage_status
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
- Top products: {json.dumps(context.get('top_products', []))}
- Sales last 7 days: {json.dumps(context.get('sales_last_7_days', []))}
- Customer segments: {json.dumps(context.get('segments', {}))}
"""
    prompts = {
        "daily": base + """
Generate a daily business insight report in this exact JSON format:
{"title":"short title","summary":"2-3 sentence overview","highlights":["insight 1"],"warnings":["concern if any"],"action_items":["action 1","action 2","action 3"],"tomorrow_focus":"one key thing"}
Respond ONLY with valid JSON.""",
        "demand": base + """
{"title":"Demand Forecast Insights","trending_up":["products"],"trending_down":["products"],"restock_urgently":["products"],"action_items":["action 1"],"summary":"2-sentence summary"}
Respond ONLY with valid JSON.""",
        "customer": base + """
{"title":"Customer Intelligence Report","loyal_customers_tip":"tip","at_risk_customers_tip":"tip","new_customers_tip":"tip","action_items":["action 1"],"summary":"summary"}
Respond ONLY with valid JSON.""",
        "inventory": base + """
{"title":"Inventory Health Report","critical_items":["items"],"overstock_items":["items"],"reorder_suggestions":[{"product":"name","suggested_qty":100}],"action_items":["action 1"],"summary":"summary"}
Respond ONLY with valid JSON.""",
    }
    return prompts.get(insight_type, prompts["daily"])


@router.post("/generate")
async def generate_insight(
    req: InsightRequest,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    """Free: 3 AI insights/day. Premium: unlimited."""

    # Raises HTTP 429 automatically if daily limit reached
    usage = check_and_increment(user_id, "ai_insights", db)

    # Gather context
    dashboard = db.rpc("get_dashboard_summary", {"p_user_id": user_id}).execute().data or {}
    seg_rows  = db.table("customers").select("segment").eq("user_id", user_id).execute()
    counts: dict = {}
    for c in (seg_rows.data or []):
        counts[c["segment"]] = counts.get(c["segment"], 0) + 1
    dashboard["segments"] = counts

    prompt = build_insight_prompt(req.type, dashboard)

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=800,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        insight_data = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    stored = db.table("insights").insert({
        "user_id":      user_id,
        "type":         req.type,
        "title":        insight_data.get("title", "AI Insight"),
        "content":      json.dumps(insight_data),
        "action_items": insight_data.get("action_items", []),
        "model_used":   "gpt-4o-mini",
        "input_data":   dashboard,
        "created_at":   datetime.utcnow().isoformat(),
    }).execute()

    return {
        "insight":      insight_data,
        "id":           stored.data[0]["id"] if stored.data else None,
        "generated_at": datetime.utcnow().isoformat(),
        "usage":        usage,
    }


@router.get("")
async def get_insights(
    limit: int = 10,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    result = db.table("insights").select("*").eq("user_id", user_id) \
               .order("created_at", desc=True).limit(limit).execute()
    return result.data or []


@router.get("/usage")
async def get_all_usage(
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    """Returns today's usage for all features — powers frontend usage meter."""
    return get_usage_status(user_id, db)


@router.put("/{insight_id}/read")
async def mark_insight_read(
    insight_id: str,
    user_id: str = Depends(verify_token),
    db=Depends(get_db)
):
    db.table("insights").update({"is_read": True}) \
      .eq("id", insight_id).eq("user_id", user_id).execute()
    return {"message": "Marked as read"}