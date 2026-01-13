-- Rate limiting table
CREATE TABLE public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits(identifier, endpoint, window_start);

-- Checkout intents table for one-time use tokens
CREATE TABLE public.checkout_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_token TEXT NOT NULL UNIQUE,
    ip_hash TEXT NOT NULL,
    user_agent_hash TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for token lookup
CREATE INDEX idx_checkout_intents_token ON public.checkout_intents(intent_token);
CREATE INDEX idx_checkout_intents_expires ON public.checkout_intents(expires_at);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_intents ENABLE ROW LEVEL SECURITY;

-- RLS policies - only service role can access these tables
CREATE POLICY "Service role only for rate_limits" ON public.rate_limits
    FOR ALL USING (false);

CREATE POLICY "Service role only for checkout_intents" ON public.checkout_intents
    FOR ALL USING (false);

-- Cleanup function for old records
CREATE OR REPLACE FUNCTION public.cleanup_old_security_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Delete rate limit records older than 1 hour
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 hour';
    
    -- Delete checkout intents older than 24 hours
    DELETE FROM public.checkout_intents WHERE created_at < now() - interval '24 hours';
END;
$$;