-- Add columns for tracking CV rewrites usage
ALTER TABLE public.subscription_usage
ADD COLUMN rewrites_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN rewrites_limit INTEGER NOT NULL DEFAULT 0;