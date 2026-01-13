import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  getCorsHeaders,
  createSecureError,
  secureLog,
  generateRequestId,
  ERROR_CODES,
} from "../_shared/security.ts";

const PRODUCT_LIMITS: Record<string, number> = {
  "prod_SoLMeWK4h9D90o": 8,
  "prod_SoLNLB46DyQGr1": 12,
  "prod_SoLNjxp9RQNJIo": 999999,
  "prod_TY5YW5pWY0NLax": 8,
  "prod_TY5ZXRFPInS0UH": 12,
  "prod_TY5ZiELFu8XH7y": 999999,
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const requestId = generateRequestId();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    secureLog("increment-usage", "started", requestId);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      secureLog("increment-usage", "missing_stripe_key", requestId);
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, ERROR_CODES.INTERNAL_ERROR.message, requestId)),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.UNAUTHORIZED.code, ERROR_CODES.UNAUTHORIZED.message, requestId)),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user?.email) {
      secureLog("increment-usage", "auth_failed", requestId);
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.UNAUTHORIZED.code, ERROR_CODES.UNAUTHORIZED.message, requestId)),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.user;
    secureLog("increment-usage", "authenticated", requestId, { userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        error: { code: "NO_SUBSCRIPTION", message: "Assinatura não encontrada", request_id: requestId }
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
        error: { code: "NO_ACTIVE_SUBSCRIPTION", message: "Sem assinatura ativa", request_id: requestId }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const subscription = subscriptions.data[0];
    const stripeSubscriptionId = subscription.id;
    const productId = subscription.items.data[0].price.product as string;
    const analysesLimit = PRODUCT_LIMITS[productId] || 0;
    
    const now = new Date();
    const periodStart = subscription.current_period_start 
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : now.toISOString();
    const periodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: existingUsage } = await supabaseClient
      .from("subscription_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .gte("period_end", new Date().toISOString())
      .order("period_end", { ascending: false })
      .limit(1);

    let currentUsage = 0;
    let usageRecordId = null;

    if (existingUsage && existingUsage.length > 0) {
      currentUsage = existingUsage[0].analyses_used;
      usageRecordId = existingUsage[0].id;
    }

    if (analysesLimit < 999999 && currentUsage >= analysesLimit) {
      return new Response(JSON.stringify({ 
        success: false,
        error: { code: "LIMIT_REACHED", message: "Limite de análises atingido", request_id: requestId },
        analyses_used: currentUsage,
        analyses_limit: analysesLimit,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (usageRecordId) {
      await supabaseClient
        .from("subscription_usage")
        .update({ analyses_used: currentUsage + 1 })
        .eq("id", usageRecordId);
    } else {
      await supabaseClient
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
    }

    secureLog("increment-usage", "completed", requestId, { 
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
    secureLog("increment-usage", "error", requestId, { error: errorMessage });
    
    return new Response(
      JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, ERROR_CODES.INTERNAL_ERROR.message, requestId)),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
