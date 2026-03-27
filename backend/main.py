from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

from routes import bills, products, customers, dashboard, insights, alerts, subscriptions
from auth import verify_token

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Vyapaar AI Copilot backend starting...")
    yield
    print("🛑 Shutting down...")

app = FastAPI(
    title="Vyapaar AI Copilot API",
    description="Autonomous AI Operating System for Small Businesses",
    version="1.0.0",
    lifespan=lifespan
)

# Read allowed origins from env
_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
