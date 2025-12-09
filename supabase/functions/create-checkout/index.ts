import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Price IDs for different products
const PRICE_IDS = {
  premium_single: "price_1SadsnJmb1TyvE3zq8Mslx2G",
  basico: "price_1SazNiJmb1TyvE3zbLklgJmP",
  intermediario: "price_1SazNxJmb1TyvE3z9L6ywLLz",
  avancado: "price_1SazOBJmb1TyvE3zJUHhdhIQ",
};

// Coupon IDs - normalized to uppercase for case-insensitive matching
const COUPON_IDS: Record<string, string> = {
  "PRIMEIROCVX": "Olpizqrc",
  "NOVAVERSAO": "m4JTy2oX",
  "NOVAVERSAO10": "MMqEDueX",
  "CUPONTESTEGABSI": "zawoQTFa",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const body = await req.json().catch(() => ({}));
    const { productType = "premium_single", couponCode } = body;
    
    logStep("Request body", { productType, couponCode });

    // Check if user is authenticated (optional for this flow)
    let userEmail: string | undefined;
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user?.email) {
        userEmail = data.user.email;
        logStep("User authenticated", { email: userEmail });
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check if customer exists
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing customer", { customerId });
      }
    }

    const origin = req.headers.get("origin") || "https://cvx.lovable.app";
    
    // Determine the price ID and mode
    const priceId = PRICE_IDS[productType as keyof typeof PRICE_IDS] || PRICE_IDS.premium_single;
    const isSubscription = ["basico", "intermediario", "avancado"].includes(productType);
    
    logStep("Checkout config", { priceId, isSubscription, productType });

    // Build checkout session config
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isSubscription ? "subscription" : "payment",
      success_url: isSubscription 
        ? `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`
        : `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=true`,
      allow_promotion_codes: true,
    };

    // Apply coupon if provided and valid (case-insensitive)
    const normalizedCouponCode = couponCode?.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalizedCouponCode && COUPON_IDS[normalizedCouponCode]) {
      sessionConfig.discounts = [{ coupon: COUPON_IDS[normalizedCouponCode] }];
      // Remove allow_promotion_codes when using discounts
      delete sessionConfig.allow_promotion_codes;
      logStep("Applied coupon", { couponCode, normalizedCouponCode, couponId: COUPON_IDS[normalizedCouponCode] });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
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
