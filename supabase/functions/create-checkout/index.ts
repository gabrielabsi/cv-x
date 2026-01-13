import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  getCorsHeaders,
  createSecureError,
  secureLog,
  hashIdentifier,
  checkRateLimit,
  generateRequestId,
  isSuspiciousRequest,
  verifyHmacSignature,
  isValidRedirectUrl,
  ERROR_CODES,
} from "../_shared/security.ts";

// Price IDs for different products (server-side allowlist)
const PRICE_IDS: Record<string, string> = {
  premium_single: "price_1SadsnJmb1TyvE3zq8Mslx2G",
  basico: "price_1SazNiJmb1TyvE3zbLklgJmP",
  intermediario: "price_1SazNxJmb1TyvE3z9L6ywLLz",
  avancado: "price_1SazOBJmb1TyvE3zJUHhdhIQ",
  mentoria: "price_1ScVDFJmb1TyvE3zlpLOc3I8",
};

// Coupon IDs - normalized to uppercase for case-insensitive matching
const COUPON_IDS: Record<string, string> = {
  "PRIMEIROCVX": "Olpizqrc",
  "NOVAVERSAO": "m4JTy2oX",
  "NOVAVERSAO10": "MMqEDueX",
  "CUPONTESTEGABSI": "zawoQTFa",
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const requestId = generateRequestId();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify(createSecureError("METHOD_NOT_ALLOWED", "Método não permitido", requestId)),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    secureLog("create-checkout", "started", requestId);

    // Soft security check
    const suspiciousCheck = isSuspiciousRequest(req);
    if (suspiciousCheck.suspicious) {
      secureLog("create-checkout", "suspicious_request", requestId, { reason: suspiciousCheck.reason });
    }

    // Get client identifiers for rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    
    const ipHash = await hashIdentifier(clientIp);
    const fingerprint = await hashIdentifier(`${clientIp}:${userAgent}`);

    // Rate limits
    const ipRateLimit = await checkRateLimit(supabaseClient, ipHash, "checkout", 5, 10);
    const fingerprintRateLimit = await checkRateLimit(supabaseClient, fingerprint, "checkout-fp", 3, 10);
    
    if (!ipRateLimit.allowed || !fingerprintRateLimit.allowed) {
      secureLog("create-checkout", "rate_limited", requestId, { ipHash, fingerprint });
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.RATE_LIMITED.code, ERROR_CODES.RATE_LIMITED.message, requestId)),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate Content-Type
    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INVALID_INPUT.code, "Content-Type deve ser application/json", requestId)),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INVALID_INPUT.code, "JSON inválido", requestId)),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { productType = "premium_single", couponCode, intentToken } = body;

    // Authentication: require either JWT or valid intent token
    const authHeader = req.headers.get("Authorization");
    let userEmail: string | undefined;
    let isAuthenticated = false;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Validate JWT
      const token = authHeader.replace("Bearer ", "");
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const { data } = await anonClient.auth.getUser(token);
      if (data.user?.email) {
        userEmail = data.user.email;
        isAuthenticated = true;
        secureLog("create-checkout", "jwt_authenticated", requestId, { userId: data.user.id });
      }
    }

    // If not JWT authenticated, require and validate intent token
    if (!isAuthenticated) {
      if (!intentToken) {
        return new Response(
          JSON.stringify(createSecureError(ERROR_CODES.UNAUTHORIZED.code, "Autenticação ou token de intenção necessário", requestId)),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate intent token
      const [payloadBase64, signature] = intentToken.split(".");
      if (!payloadBase64 || !signature) {
        return new Response(
          JSON.stringify(createSecureError(ERROR_CODES.UNAUTHORIZED.code, "Token inválido", requestId)),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let tokenPayload;
      try {
        tokenPayload = JSON.parse(atob(payloadBase64));
      } catch {
        return new Response(
          JSON.stringify(createSecureError(ERROR_CODES.UNAUTHORIZED.code, "Token inválido", requestId)),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify signature
      const hmacSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      const isValidSignature = await verifyHmacSignature(atob(payloadBase64), signature, hmacSecret);
      if (!isValidSignature) {
        secureLog("create-checkout", "invalid_signature", requestId);
        return new Response(
          JSON.stringify(createSecureError(ERROR_CODES.UNAUTHORIZED.code, "Token inválido", requestId)),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check expiration
      if (Date.now() > tokenPayload.exp) {
        return new Response(
          JSON.stringify(createSecureError(ERROR_CODES.UNAUTHORIZED.code, "Token expirado", requestId)),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify IP hash matches
      if (tokenPayload.ip_hash !== ipHash) {
        secureLog("create-checkout", "ip_mismatch", requestId, { expected: tokenPayload.ip_hash, actual: ipHash });
        return new Response(
          JSON.stringify(createSecureError(ERROR_CODES.FORBIDDEN.code, "Token inválido para esta sessão", requestId)),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check one-time use in database
      const { data: intentRecord, error: intentError } = await supabaseClient
        .from("checkout_intents")
        .select("*")
        .eq("intent_token", tokenPayload.jti)
        .single();

      if (intentError || !intentRecord) {
        secureLog("create-checkout", "intent_not_found", requestId, { jti: tokenPayload.jti });
        return new Response(
          JSON.stringify(createSecureError(ERROR_CODES.UNAUTHORIZED.code, "Token inválido ou expirado", requestId)),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (intentRecord.used) {
        secureLog("create-checkout", "intent_already_used", requestId, { jti: tokenPayload.jti });
        return new Response(
          JSON.stringify(createSecureError(ERROR_CODES.FORBIDDEN.code, "Token já utilizado", requestId)),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark intent as used
      await supabaseClient
        .from("checkout_intents")
        .update({ used: true })
        .eq("intent_token", tokenPayload.jti);

      secureLog("create-checkout", "intent_validated", requestId, { jti: tokenPayload.jti });
    }

    // Validate product type is in allowlist
    const priceId = PRICE_IDS[productType];
    if (!priceId) {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INVALID_INPUT.code, "Produto inválido", requestId)),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      secureLog("create-checkout", "missing_stripe_key", requestId);
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, ERROR_CODES.INTERNAL_ERROR.message, requestId)),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check if customer exists
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        secureLog("create-checkout", "existing_customer", requestId, { customerId });
      }
    }

    // Validate and construct redirect URLs
    const baseOrigin = origin && isValidRedirectUrl(origin) ? origin : "https://cvxapp.com";
    
    const isSubscription = ["basico", "intermediario", "avancado"].includes(productType);
    const isMentoria = productType === "mentoria";
    
    let successUrl = `${baseOrigin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    if (isSubscription) {
      successUrl = `${baseOrigin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`;
    } else if (isMentoria) {
      successUrl = `${baseOrigin}/mentorship-success?session_id={CHECKOUT_SESSION_ID}`;
    }

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
      success_url: successUrl,
      cancel_url: `${baseOrigin}/?canceled=true`,
      allow_promotion_codes: true,
      metadata: {
        request_id: requestId,
        product_type: productType,
      },
    };

    // Apply coupon if provided and valid
    const normalizedCouponCode = couponCode?.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalizedCouponCode && COUPON_IDS[normalizedCouponCode]) {
      sessionConfig.discounts = [{ coupon: COUPON_IDS[normalizedCouponCode] }];
      delete sessionConfig.allow_promotion_codes;
      secureLog("create-checkout", "coupon_applied", requestId, { couponCode: normalizedCouponCode });
    }

    // Create checkout session with idempotency key
    const idempotencyKey = await hashIdentifier(`${requestId}:${Math.floor(Date.now() / 30000)}`);
    const session = await stripe.checkout.sessions.create(sessionConfig, {
      idempotencyKey,
    });

    secureLog("create-checkout", "session_created", requestId, { sessionId: session.id });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    secureLog("create-checkout", "error", requestId, { error: errorMessage });
    
    return new Response(
      JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, ERROR_CODES.INTERNAL_ERROR.message, requestId)),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
