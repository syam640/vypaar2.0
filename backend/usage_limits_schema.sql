-- ============================================================
-- VYAPAAR AI COPILOT — USAGE LIMITS TABLE
-- Run in Supabase → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS public.usage_limits (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature      TEXT NOT NULL,          -- 'ai_insights' | 'forecast' | 'health_score'
  usage_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  count        INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, feature, usage_date)  -- one row per user per feature per day
);

CREATE INDEX IF NOT EXISTS idx_usage_limits_user_date
  ON public.usage_limits (user_id, usage_date);

CREATE INDEX IF NOT EXISTS idx_usage_limits_feature
  ON public.usage_limits (feature);

-- RLS
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON public.usage_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Auto update updated_at
CREATE TRIGGER trg_usage_limits_updated_at
  BEFORE UPDATE ON public.usage_limits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
