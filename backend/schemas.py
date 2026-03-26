from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# ── Products ──────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    stock: int = Field(..., ge=0)
    category: str = "General"
    unit: str = "piece"
    threshold: int = 10

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    threshold: Optional[int] = None
    is_active: Optional[bool] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    price: float
    stock: int
    category: str
    unit: str
    threshold: int
    is_active: bool


# ── Customers ─────────────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


# ── Billing ───────────────────────────────────────────────────────────────────

class BillItem(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)
    discount: float = Field(default=0, ge=0, le=100)  # percentage

class BillCreate(BaseModel):
    customer_id: Optional[str] = None
    items: List[BillItem] = Field(..., min_length=1)
    payment_mode: str = "cash"
    notes: Optional[str] = None

class BillResponse(BaseModel):
    bill_id: str
    total_amount: float
    items_count: int
    message: str


# ── Insights ──────────────────────────────────────────────────────────────────

class InsightRequest(BaseModel):
    type: str = "daily"   # daily | weekly | demand | customer | inventory


# ── Subscriptions ─────────────────────────────────────────────────────────────

class SubscriptionCreate(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str
    plan: str = "premium"
