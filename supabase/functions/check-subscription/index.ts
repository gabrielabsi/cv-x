import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Product limits mapping (analyses)
const PRODUCT_LIMITS: Record<string, number> = {
  "prod_SoLMeWK4h9D90o": 8,       // CVX Básico (old) - 8 analyses
  "prod_SoLNLB46DyQGr1": 12,      // CVX Intermediário (old) - 12 analyses
  "prod_SoLNjxp9RQNJIo": 999999,  // CVX Avançado (old) - unlimited
  "prod_TY5YW5pWY0NLax": 8,       // CVX Básico - 8 analyses
  "prod_TY5ZXRFPInS0UH": 12,      // CVX Intermediário - 12 analyses
  "prod_TY5ZiELFu8XH7y": 999999,  // CVX Avançado - unlimited
};

// Product limits for CV rewrites
const REWRITE_LIMITS: Record<string, number> = {
  "prod_SoLMeWK4h9D90o": 0,       // CVX Básico (old) - 0 rewrites
  "prod_SoLNLB46DyQGr1": 4,       // CVX Intermediário (old) - 4 rewrites
  "prod_SoLNjxp9RQNJIo": 999999,  // CVX Avançado (old) - unlimited
  "prod_TY5YW5pWY0NLax": 0,       // CVX Básico - 0 rewrites
  "prod_TY5ZXRFPInS0UH": 4,       // CVX Intermediário - 4 rewrites
  "prod_TY5ZiELFu8XH7y": 999999,  // CVX Avançado - unlimited
};

const PRODUCT_NAMES: Record<string, string> = {
  "prod_SoLMeWK4h9D90o": "CVX Básico",
  "prod_SoLNLB46DyQGr1": "CVX Intermediário",
  "prod_SoLNjxp9RQNJIo": "CVX Avançado",
  "prod_TY5YW5pWY0NLax": "CVX Básico",
  "prod_TY5ZXRFPInS0UH": "CVX Intermediário",
  "prod_TY5ZiELFu8XH7y": "CVX Avançado",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning unsubscribed state");
      return new Response(JSON.stringify({ 
        subscribed: false,
        analyses_used: 0,
        analyses_limit: 0,
        rewrites_used: 0,
        rewrites_limit: 0,
        product_name: null,
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let productName = null;
    let subscriptionEnd = null;
    let analysesLimit = 0;
    let rewritesLimit = 0;
    let periodStart = null;
    let periodEnd = null;
    let stripeSubscriptionId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      
      const now = new Date();
      
      // Safely parse dates with fallbacks
      if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        periodEnd = subscriptionEnd;
      } else {
        // Fallback: 30 days from now
        periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        subscriptionEnd = periodEnd;
      }
      
      if (subscription.current_period_start && typeof subscription.current_period_start === 'number') {
        periodStart = new Date(subscription.current_period_start * 1000).toISOString();
      } else {
        // Fallback: current time
        periodStart = now.toISOString();
      }
      
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      productId = subscription.items.data[0]?.price?.product as string;
      productName = PRODUCT_NAMES[productId] || "Plano Ativo";
      analysesLimit = PRODUCT_LIMITS[productId] || 0;
      rewritesLimit = REWRITE_LIMITS[productId] || 0;
      logStep("Determined subscription tier", { productId, productName, analysesLimit, rewritesLimit });
    } else {
      logStep("No active subscription found");
    }

    // Get or create usage record for current period
    let analysesUsed = 0;
    let rewritesUsed = 0;
    
    if (hasActiveSub && periodStart && periodEnd) {
      // Check if usage record exists for current period
      const { data: existingUsage, error: usageError } = await supabaseClient
        .from("subscription_usage")
        .select("*")
        .eq("user_id", user.id)
        .eq("stripe_subscription_id", stripeSubscriptionId)
        .gte("period_end", new Date().toISOString())
        .order("period_end", { ascending: false })
        .limit(1);

      if (usageError) {
        logStep("Error fetching usage", { error: usageError.message });
      }

      if (existingUsage && existingUsage.length > 0) {
        analysesUsed = existingUsage[0].analyses_used;
        rewritesUsed = existingUsage[0].rewrites_used || 0;
        logStep("Found existing usage record", { analysesUsed, rewritesUsed });
      } else {
        // Create new usage record for this period
        const { error: insertError } = await supabaseClient
          .from("subscription_usage")
          .insert({
            user_id: user.id,
            period_start: periodStart,
            period_end: periodEnd,
            analyses_used: 0,
            analyses_limit: analysesLimit,
            rewrites_used: 0,
            rewrites_limit: rewritesLimit,
            stripe_subscription_id: stripeSubscriptionId,
            product_type: productId,
          });

        if (insertError) {
          logStep("Error creating usage record", { error: insertError.message });
        } else {
          logStep("Created new usage record for period");
        }
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      product_name: productName,
      subscription_end: subscriptionEnd,
      analyses_used: analysesUsed,
      analyses_limit: analysesLimit,
      rewrites_used: rewritesUsed,
      rewrites_limit: rewritesLimit,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
