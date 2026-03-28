from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Load local .env file if it exists
load_dotenv()

from routes import bills, products, customers, dashboard, insights, alerts, subscriptions

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Vyapaar AI Copilot backend starting...")
    yield
    print("🛑 Vyapaar AI Copilot backend shutting down...")

app = FastAPI(
    title="Vyapaar AI Copilot API",
    description="Autonomous AI Operating System for Small Businesses",
    version="1.0.0",
    lifespan=lifespan
)

# --- BULLETPROOF CORS CONFIGURATION ---
# Get origins from Env Var or use defaults
_raw = os.getenv("ALLOWED_ORIGINS", "https://vypaar20-production.up.railway.app,http://localhost:5173,http://localhost:3000")

# This creates a list and adds versions both WITH and WITHOUT the trailing slash 
# to prevent "No Access-Control-Allow-Origin header" errors.
base_origins = [o.strip() for o in _raw.split(",") if o.strip()]
ALLOWED_ORIGINS = []
for o in base_origins:
    clean = o.rstrip("/")
    ALLOWED_ORIGINS.append(clean)
    ALLOWED_ORIGINS.append(f"{clean}/")

print(f"✅ Final CORS allowed origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    max_age=600,
)
# ---------------------------------------

# Include All Routers
app.include_router(bills.router,         prefix="/bill",         tags=["Billing"])
app.include_router(products.router,      prefix="/products",     tags=["Products"])
app.include_router(customers.router,     prefix="/customers",    tags=["Customers"])
app.include_router(dashboard.router,     prefix="/dashboard",    tags=["Dashboard"])
app.include_router(insights.router,      prefix="/insights",     tags=["Insights"])
app.include_router(alerts.router,        prefix="/alerts",       tags=["Alerts"])
app.include_router(subscriptions.router, prefix="/subscription", tags=["Subscription"])

@app.get("/")
def root():
    return {"status": "ok", "app": "Vyapaar AI Copilot", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}