from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# 1. Load local .env file
load_dotenv()

# 2. Import your route modules
# Ensure an empty __init__.py exists in your 'routes' folder!
from routes import bills, products, customers, dashboard, insights, alerts, subscriptions, chat

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Vyapaar AI Copilot backend starting...")
    yield
    print("🛑 Vyapaar AI Copilot backend shutting down...")

# 3. Initialize FastAPI App (Must happen BEFORE including routers)
app = FastAPI(
    title="Vyapaar AI Copilot API",
    description="Autonomous AI Operating System for Small Businesses",
    version="1.0.0",
    lifespan=lifespan
)

# --- JUDGE-READY CORS CONFIGURATION ---
raw_origins = os.getenv(
    "ALLOWED_ORIGINS", 
    "https://vypaar20-production.up.railway.app,http://localhost:5173,http://localhost:3000"
)

base_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
ALLOWED_ORIGINS = []
for o in base_origins:
    clean = o.rstrip("/")
    ALLOWED_ORIGINS.append(clean)
    ALLOWED_ORIGINS.append(f"{clean}/")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)
# ---------------------------------------

# 4. Include All Routers (Ordering fixed)
app.include_router(chat.router,          prefix="/chat",         tags=["AI Agent"])
app.include_router(bills.router,         prefix="/bill",         tags=["Billing"])
app.include_router(products.router,      prefix="/products",     tags=["Products"])
app.include_router(customers.router,     prefix="/customers",    tags=["Customers"])
app.include_router(dashboard.router,     prefix="/dashboard",    tags=["Dashboard"])
app.include_router(insights.router,      prefix="/insights",     tags=["Insights"])
app.include_router(alerts.router,        prefix="/alerts",       tags=["Alerts"])
app.include_router(subscriptions.router, prefix="/subscription", tags=["Subscription"])

@app.get("/")
def root():
    return {
        "status": "online", 
        "app": "Vyapaar AI Copilot", 
        "mode": "Judge-Demo-Active",
        "version": "1.0.0"
    }

@app.get("/health")
def health():
    return {"status": "healthy", "database": "connected"}