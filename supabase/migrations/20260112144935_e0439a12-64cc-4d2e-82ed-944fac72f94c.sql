-- Add restrictive INSERT policy for subscription_usage
-- This table should only be modified by service role (edge functions, webhooks)
-- Regular users should NOT be able to create subscription records

CREATE POLICY "Only system can insert subscription usage"
ON public.subscription_usage
FOR INSERT
WITH CHECK (false);

-- Note: Service role bypasses RLS, so edge functions can still insert records
-- This policy explicitly blocks any user-level insert attempts