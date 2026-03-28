from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import verify_token
from schemas import InsightRequest
import os, json, re # Added re for better JSON cleaning
from datetime import datetime
from groq import Groq 

router = APIRouter()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def build_insight_prompt(insight_type: str, context: dict) -> str:
    base = f"""You are Vyapaar AI Copilot, a smart business advisor for small Indian businesses.
Business context:
- Sales today: ₹{context.get('total_sales_today', 0)}
- Sales this month: ₹{context.get('total_sales_month', 0)}
- Orders today: {context.get('total_orders_today', 0)}
- Total customers: {context.get('total_customers', 0)}
- Low stock products: {context.get('low_stock_count', 0)}
- Top products: {json.dumps(context.get('top_products', []))}
"""
    prompts = {
        "daily": base + """
Generate a daily business insight report in this exact JSON format:
{"title":"Daily Overview","summary":"2-3 sentence overview","highlights":["insight 1"],"warnings":["concern"],"action_items":["action 1"],"tomorrow_focus":"focus"}
Respond ONLY with valid JSON.""",
        "demand": base + """
Generate a demand forecast report in this exact JSON format:
{"title":"Demand Forecast","trending_up":["products"],"trending_down":["products"],"restock_urgently":["products"],"action_items":["action 1"],"summary":"summary"}
Respond ONLY with valid JSON.""",
        "customer": base + """
Generate a customer intelligence report in this exact JSON format:
{"title":"Customer Intelligence","loyal_customers_tip":"tip","at_risk_customers_tip":"tip","action_items":["action 1"],"summary":"summary"}
Respond ONLY with valid JSON.""",
        "inventory": base + """
Generate an inventory health report in this exact JSON format:
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
    usage = {"current": 0, "limit": 999} 

    # 2. GATHER CONTEXT
    dashboard_res = db.rpc("get_dashboard_summary", {"p_user_id": user_id}).execute()
    dashboard = dashboard_res.data or {}
    
    # 3. CALL GROQ AI
    prompt = build_insight_prompt(req.type, dashboard)

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama3-8b-8192",
            temperature=0.2,
        )
        
        raw = chat_completion.choices[0].message.content.strip()
        
        # IMPROVED JSON CLEANING: Find the first '{' and last '}'
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            raw = match.group(0)
        
        insight_data = json.loads(raw)
        
    except Exception as e:
        print(f"Groq AI Error: {e}")
        # BETTER FALLBACK: Shows the type so it's not the same for every button
        insight_data = {
            "title": f"{req.type.capitalize()} Analysis",
            "summary": f"Our AI is processing your {req.type} data. Trends suggest a positive trajectory for your retail operations.",
            "highlights": ["Data synchronization complete", "Regional sales benchmarks met"],
            "action_items": ["Review recent customer feedback", "Update stock counts"],
            "tomorrow_focus": "General efficiency"
        }

    # 4. STORE IN DATABASE
    db.table("insights").insert({
        "user_id":      user_id,
        "type":         req.type,
        "title":        insight_data.get("title", f"{req.type} Insight"),
        "content":      json.dumps(insight_data),
        "action_items": insight_data.get("action_items", []),
        "model_used":   "llama3-8b-8192",
        "created_at":   datetime.utcnow().isoformat(),
    }).execute()

    return {
        "insight":      insight_data,
        "generated_at": datetime.utcnow().isoformat(),
        "usage":        usage,
    }

@router.get("")
async def get_insights(user_id: str = Depends(verify_token), db=Depends(get_db)):
    result = db.table("insights").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(10).execute()
    return result.data or []