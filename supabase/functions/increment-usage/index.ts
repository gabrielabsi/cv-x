import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[INCREMENT-USAGE] ${step}${detailsStr}`);
};

// Product limits mapping
const PRODUCT_LIMITS: Record<string, number> = {
  "prod_SoLMeWK4h9D90o": 8,       // CVX Básico (old) - 8 analyses
  "prod_SoLNLB46DyQGr1": 12,      // CVX Intermediário (old) - 12 analyses
  "prod_SoLNjxp9RQNJIo": 999999,  // CVX Avançado (old) - unlimited
  "prod_TY5YW5pWY0NLax": 8,       // CVX Básico - 8 analyses
  "prod_TY5ZXRFPInS0UH": 12,      // CVX Intermediário - 12 analyses
  "prod_TY5ZiELFu8XH7y": 999999,  // CVX Avançado - unlimited
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get active subscription from Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        error: "No subscription found"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        error: "No active subscription"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const subscription = subscriptions.data[0];
    const stripeSubscriptionId = subscription.id;
    const productId = subscription.items.data[0].price.product as string;
    const analysesLimit = PRODUCT_LIMITS[productId] || 0;
    
    // Handle period dates - use current date if subscription dates are missing
    const now = new Date();
    const periodStartTimestamp = subscription.current_period_start;
    const periodEndTimestamp = subscription.current_period_end;
    
    const periodStart = periodStartTimestamp 
      ? new Date(periodStartTimestamp * 1000).toISOString()
      : now.toISOString();
    const periodEnd = periodEndTimestamp 
      ? new Date(periodEndTimestamp * 1000).toISOString()
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
    
    logStep("Subscription details", { stripeSubscriptionId, productId, analysesLimit, periodStart, periodEnd });

    // Get current usage record
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

    let currentUsage = 0;
    let usageRecordId = null;

    if (existingUsage && existingUsage.length > 0) {
      currentUsage = existingUsage[0].analyses_used;
      usageRecordId = existingUsage[0].id;
    }

    // Check if limit exceeded (skip for unlimited plans)
    if (analysesLimit < 999999 && currentUsage >= analysesLimit) {
      return new Response(JSON.stringify({ 
        success: false,
        error: "Analysis limit reached for this billing period",
        analyses_used: currentUsage,
        analyses_limit: analysesLimit,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Increment usage
    if (usageRecordId) {
      const { error: updateError } = await supabaseClient
        .from("subscription_usage")
        .update({ analyses_used: currentUsage + 1 })
        .eq("id", usageRecordId);

      if (updateError) {
        logStep("Error updating usage", { error: updateError.message });
        throw new Error("Failed to update usage");
      }
    } else {
      // Create new record if doesn't exist
      const { error: insertError } = await supabaseClient
        .from("subscription_usage")
        .insert({
          user_id: user.id,
          period_start: periodStart,
          period_end: periodEnd,
          analyses_used: 1,
          analyses_limit: analysesLimit,
          stripe_subscription_id: stripeSubscriptionId,
          product_type: productId,
        });

      if (insertError) {
        logStep("Error creating usage record", { error: insertError.message });
        throw new Error("Failed to create usage record");
      }
    }

    logStep("Usage incremented successfully", { 
      previousUsage: currentUsage, 
      newUsage: currentUsage + 1,
      limit: analysesLimit 
    });

    return new Response(JSON.stringify({
      success: true,
      analyses_used: currentUsage + 1,
      analyses_limit: analysesLimit,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
