# Vyapaar AI Copilot — Deploy Guide
# 2-day deployment checklist

---

## STEP 1 — Supabase (5 min)
1. Go to https://supabase.com → New Project → name it "vyapaar"
2. SQL Editor → New Query → paste vyapaar_supabase_schema.sql → Run
3. Settings → API → copy:
   - Project URL         → SUPABASE_URL
   - anon public key     → SUPABASE_ANON_KEY (frontend)
   - service_role key    → SUPABASE_SERVICE_ROLE_KEY (backend only, never expose)
   - JWT Secret          → SUPABASE_JWT_SECRET (Settings → API → JWT Settings)

---

## STEP 2 — Run backend locally (3 min)
```bash
cd vyapaar-backend
cp .env.example .env          # fill in all keys
pip install -r requirements.txt
uvicorn main:app --reload
```
Open http://localhost:8000/docs → all routes visible ✅

---

## STEP 3 — Run frontend locally (3 min)
```bash
cd vyapaar-frontend
cp .env.example .env          # fill in keys
npm install
npm run dev
```
Open http://localhost:5173 → sign up → full app ✅

---

## STEP 4 — Deploy backend to Render (10 min)
1. Push vyapaar-backend/ to a GitHub repo
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - Runtime: Python 3
   - Build command:  pip install -r requirements.txt
   - Start command:  uvicorn main:app --host 0.0.0.0 --port $PORT
5. Environment Variables → add all from .env
6. Deploy → copy the live URL (e.g. https://vyapaar-backend.onrender.com)

---

## STEP 5 — Deploy frontend to Vercel (5 min)
1. Push vyapaar-frontend/ to a GitHub repo
2. Go to https://vercel.com → New Project → import repo
3. Framework: Vite
4. Environment Variables → add:
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   VITE_API_URL=https://vyapaar-backend.onrender.com   ← your Render URL
   VITE_RAZORPAY_KEY_ID
5. Deploy → live URL ready in 2 minutes ✅

---

## STEP 6 — Razorpay setup (10 min)
1. https://dashboard.razorpay.com → Plans → Create Plan
   - Name: Vyapaar Premium
   - Amount: 49900 (paise = ₹499)
   - Interval: monthly
   - Copy Plan ID → RAZORPAY_PLAN_ID in backend .env
2. Settings → Webhooks → Add webhook
   - URL: https://vyapaar-backend.onrender.com/subscription/webhook
   - Events: subscription.charged, subscription.cancelled, subscription.expired
   - Copy webhook secret → RAZORPAY_WEBHOOK_SECRET

---

## STEP 7 — Final checks
- [ ] Sign up on the live frontend URL
- [ ] Add a product in Inventory
- [ ] Create a bill
- [ ] Check Dashboard shows stats
- [ ] Upgrade to Premium → AI Insights work
- [ ] Low stock alert fires when stock hits threshold

---

## Files summary
vyapaar-backend/
  main.py              FastAPI app
  database.py          Supabase client
  auth.py              JWT verification
  schemas.py           Request models
  routes/bills.py      Billing engine
  routes/products.py   Inventory CRUD
  routes/customers.py  Customer + RFM
  routes/dashboard.py  Stats + forecast
  routes/insights.py   LLM AI insights
  routes/alerts.py     Alert management
  routes/subscriptions.py  Razorpay
  ml/forecasting.py    Prophet demand
  ml/segmentation.py   RFM K-Means
  ml/anomaly.py        Z-score + health
  requirements.txt
  render.yaml

vyapaar-frontend/
  src/pages/Auth.jsx          Login/signup
  src/pages/Dashboard.jsx     Stats + charts
  src/pages/Billing.jsx       Create bills
  src/pages/Inventory.jsx     Products CRUD
  src/pages/Customers.jsx     Customer list + segments
  src/pages/Insights.jsx      AI insights
  src/pages/Alerts.jsx        Alert center
  src/pages/Subscription.jsx  Razorpay upgrade
  src/components/Layout.jsx   Sidebar nav
  src/context/AuthContext.jsx Supabase auth
  src/lib/supabase.js         API + auth client
  vercel.json

---
Built for Indian small businesses 🇮🇳
