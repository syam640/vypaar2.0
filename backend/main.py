import os
import sys
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from groq import Groq

# 1. Load Environment Variables
load_dotenv()

# --- 🛠️ THE PATH FIX (Crucial for Render/Linux) ---
# This forces Python to look at the current folder for 'routes'
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# 2. Setup AI Client
GROQ_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_KEY) if GROQ_KEY else None

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Vyapaar AI Production Mode: Active")
    yield

app = FastAPI(title="Vyapaar AI OS", lifespan=lifespan)

# --- 🛡️ PRODUCTION CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For demo/production safety
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 🤖 THE AI AGENT ENDPOINT ---
@app.post("/chat/ask")
async def ask_agent(req: Request):
    if not client:
        return {"answer": "AI Brain is offline. Check API key."}
    try:
        body = await req.json()
        user_query = body.get("prompt", "Hello")
        completion = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "system", "content": "You are Vyapaar Agent. Help Indian SMEs. Be brief."},
                {"role": "user", "content": user_query}
            ],
            temperature=0.5,
        )
        return {"answer": completion.choices[0].message.content}
    except Exception as e:
        return {"answer": "Connecting to brain... try again in 5 seconds."}

# --- 🍎 BASE ROUTES ---
@app.get("/")
def root():
    return {"status": "online", "mode": "production"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# --- 📂 DYNAMIC ROUTE LOADING (Fixed Pathing) ---
try:
    # Explicit imports from the routes package
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
    print(f"❌ Route Load Error: {str(e)}")