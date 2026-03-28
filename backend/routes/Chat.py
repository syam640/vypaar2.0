from fastapi import APIRouter, Depends, HTTPException, Request
from groq import Groq
import os
import json
from auth import verify_token
from database import get_db

router = APIRouter()

# Initialize Groq Client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@router.post("/ask")
async def ask_agent(req: Request, user_id: str = Depends(verify_token), db=Depends(get_db)):
    # 1. Get the prompt from the frontend
    body = await req.json()
    user_query = body.get("prompt")
    
    if not user_query:
        raise HTTPException(status_code=400, detail="Prompt is required")

    try:
        # 2. Fetch business context so the Agent knows what it's talking about
        # We use the same RPC call you used for the Dashboard
        dash_res = db.rpc("get_dashboard_summary", {"p_user_id": user_id}).execute()
        data = dash_res.data or {}

        # 3. Create a "Personality" for your Agent
        system_instructions = f"""
        You are 'Vyapaar Agent', a highly intelligent business assistant for an Indian retail shop.
        
        Current Business Data:
        - Today's Sales: ₹{data.get('total_sales_today', 0)}
        - This Month's Sales: ₹{data.get('total_sales_month', 0)}
        - Low Stock Count: {data.get('low_stock_count', 0)}
        - Total Customers: {data.get('total_customers', 0)}
        
        Instructions:
        - Be extremely concise (max 2 sentences).
        - Use a helpful, professional tone.
        - Mention specific numbers from the data if the user asks about performance.
        - Use Indian terms like 'GST', 'Stock', or 'Khata' where appropriate.
        """

        # 4. Call Groq (Llama-3) for a lightning-fast response
        completion = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "system", "content": system_instructions},
                {"role": "user", "content": user_query}
            ],
            temperature=0.5,
            max_tokens=150
        )

        answer = completion.choices[0].message.content
        return {"answer": answer}

    except Exception as e:
        print(f"Agent Error: {e}")
        return {"answer": "I'm having trouble accessing the shop records right now. Please try again in a moment."}