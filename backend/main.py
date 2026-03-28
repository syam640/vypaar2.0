import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv

# 1. Load Env
load_dotenv()

# 2. Try to import existing routes, but don't crash if they fail
try:
    from routes.bills import router as bills_router
    from routes.products import router as products_router
    from routes.customers import router as customers_router
    from routes.dashboard import router as dashboard_router
    from routes.insights import router as insights_router
    from routes.alerts import router as alerts_router
    from routes.subscriptions import router as subscriptions_router
except ImportError as e:
    print(f"⚠️ Warning: Some routes could not be imported: {e}")

# 3. Initialize App
app = FastAPI(title="Vyapaar AI Copilot")

# 4. CORS - Wide open for Demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. AI AGENT LOGIC (Built-in to prevent ModuleNotFoundError)
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@app.post("/chat/ask")
async def ask_agent(req: Request):
    body = await req.json()
    user_query = body.get("prompt")
    try:
        completion = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "system", "content": "You are Vyapaar Agent, a business assistant. Be brief and helpful."},
                {"role": "user", "content": user_query}
            ],
            temperature=0.5,
        )
        return {"answer": completion.choices[0].message.content}
    except Exception as e:
        return {"answer": "I'm online but having trouble thinking. Check the Groq API key!"}

# 6. Include Other Routers if they were imported
try:
    app.include_router(bills_router,         prefix="/bill",         tags=["Billing"])
    app.include_router(products_router,      prefix="/products",     tags=["Products"])
    app.include_router(customers_router,     prefix="/customers",    tags=["Customers"])
    app.include_router(dashboard_router,     prefix="/dashboard",    tags=["Dashboard"])
    app.include_router(insights_router,      prefix="/insights",     tags=["Insights"])
    app.include_router(alerts_router,        prefix="/alerts",       tags=["Alerts"])
    app.include_router(subscriptions_router, prefix="/subscription", tags=["Subscription"])
except NameError:
    pass

@app.get("/")
def root(): return {"status": "online", "message": "Vyapaar Backend is Live"}

@app.get("/health")
def health(): return {"status": "healthy"}