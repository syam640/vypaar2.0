import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# 1. Load Environment
load_dotenv()

# 2. LOCAL IMPORTS
# We use 'from routes.FILENAME' because we are running from the backend directory
try:
    from routes.bills import router as bills_router
    from routes.products import router as products_router
    from routes.customers import router as customers_router
    from routes.dashboard import router as dashboard_router
    from routes.insights import router as insights_router
    from routes.alerts import router as alerts_router
    from routes.subscriptions import router as subscriptions_router
    from routes.chat import router as chat_router 
except ImportError as e:
    print(f"❌ Import Error: {e}")
    # Fallback for different directory structures
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from routes.chat import router as chat_router
    from routes.bills import router as bills_router
    from routes.products import router as products_router
    from routes.customers import router as customers_router
    from routes.dashboard import router as dashboard_router
    from routes.insights import router as insights_router
    from routes.alerts import router as alerts_router
    from routes.subscriptions import router as subscriptions_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Vyapaar AI Copilot backend starting...")
    yield
    print("🛑 Vyapaar AI Copilot backend shutting down...")

# 3. Initialize App
app = FastAPI(
    title="Vyapaar AI Copilot API",
    version="1.0.0",
    lifespan=lifespan
)

# --- CORS ---
raw_origins = os.getenv("ALLOWED_ORIGINS", "https://vypaar20-production.up.railway.app,http://localhost:5173")
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

# --- REGISTER ROUTES ---
app.include_router(chat_router,          prefix="/chat",         tags=["AI Agent"])
app.include_router(bills_router,         prefix="/bill",         tags=["Billing"])
app.include_router(products_router,      prefix="/products",     tags=["Products"])
app.include_router(customers_router,     prefix="/customers",    tags=["Customers"])
app.include_router(dashboard_router,     prefix="/dashboard",    tags=["Dashboard"])
app.include_router(insights_router,      prefix="/insights",     tags=["Insights"])
app.include_router(alerts_router,        prefix="/alerts",       tags=["Alerts"])
app.include_router(subscriptions_router, prefix="/subscription", tags=["Subscription"])

@app.get("/")
def root():
    return {"status": "online", "mode": "Judge-Demo-Active"}

@app.get("/health")
def health():
    return {"status": "healthy"}