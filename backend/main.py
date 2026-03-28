import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from groq import Groq

# 1. Load Environment
load_dotenv()

# 2. Setup AI Agent
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI(title="Vyapaar AI OS")

# --- 🛡️ CORS (Allow Railway to talk to Render) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 🤖 AI CHAT ENDPOINT ---
@app.post("/chat/ask")
async def ask_agent(req: Request):
    try:
        body = await req.json()
        user_query = body.get("prompt", "Hello")
        completion = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "system", "content": "You are Vyapaar AI. Help Indian SMEs. Be very brief."},
                {"role": "user", "content": user_query}
            ],
            temperature=0.5,
        )
        return {"answer": completion.choices[0].message.content}
    except Exception as e:
        return {"answer": "Agent is waking up... please try in 10 seconds."}

# --- 📂 LOADING YOUR BUSINESS ROUTES ---
# Now that __init__.py exists, these will work perfectly!
try:
    from routes import bills, products, customers, dashboard, insights, alerts, subscriptions
    
    app.include_router(bills.router,         prefix="/bill",         tags=["Billing"])
    app.include_router(products.router,      prefix="/products",     tags=["Products"])
    app.include_router(customers.router,     prefix="/customers",    tags=["Customers"])
    app.include_router(dashboard.router,     prefix="/dashboard",    tags=["Dashboard"])
    app.include_router(insights.router,      prefix="/insights",     tags=["Insights"])
    app.include_router(alerts.router,        prefix="/alerts",       tags=["Alerts"])
    app.include_router(subscriptions.router, prefix="/subscription", tags=["Subscription"])
    
    print("✅ Successfully loaded all business routes!")
except Exception as e:
    print(f"❌ Route Load Error: {e}")

@app.get("/")
def root():
    return {"status": "online", "message": "Vyapaar Backend is fully loaded"}