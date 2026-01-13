import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  getCorsHeaders,
  createSecureError,
  secureLog,
  hashIdentifier,
  checkRateLimit,
  generateRequestId,
  isSuspiciousRequest,
  createHmacSignature,
  ERROR_CODES,
} from "../_shared/security.ts";

// Valid plan IDs
const VALID_PLANS = [
  "premium_single",
  "basico",
  "intermediario",
  "avancado",
  "mentoria",
];

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
    secureLog("create-checkout-intent", "started", requestId);

    // Soft security check
    const suspiciousCheck = isSuspiciousRequest(req);
    if (suspiciousCheck.suspicious) {
      secureLog("create-checkout-intent", "suspicious_request", requestId, { reason: suspiciousCheck.reason });
    }

    // Get client identifiers for rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    
    const ipHash = await hashIdentifier(clientIp);
    const fingerprint = await hashIdentifier(`${clientIp}:${userAgent}`);

    // Rate limit: 10 requests per 10 minutes per IP
    const rateLimit = await checkRateLimit(supabaseClient, ipHash, "checkout-intent", 10, 10);
    if (!rateLimit.allowed) {
      secureLog("create-checkout-intent", "rate_limited", requestId, { ipHash });
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

    const { planId = "premium_single" } = body;

    // Validate plan ID
    if (!VALID_PLANS.includes(planId)) {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INVALID_INPUT.code, "Plano inválido", requestId)),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate intent token
    const jti = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    const tokenPayload = JSON.stringify({
      jti,
      ip_hash: ipHash,
      ua_hash: await hashIdentifier(userAgent),
      plan_id: planId,
      exp: expiresAt.getTime(),
    });

    const hmacSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const signature = await createHmacSignature(tokenPayload, hmacSecret);
    const intentToken = btoa(tokenPayload) + "." + signature;

    // Store intent in database for one-time use validation
    const { error: insertError } = await supabaseClient
      .from("checkout_intents")
      .insert({
        intent_token: jti, // Store only the jti for lookup
        ip_hash: ipHash,
        user_agent_hash: await hashIdentifier(userAgent),
        plan_id: planId,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (insertError) {
      secureLog("create-checkout-intent", "db_insert_error", requestId, { error: insertError.message });
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, ERROR_CODES.INTERNAL_ERROR.message, requestId)),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    secureLog("create-checkout-intent", "intent_created", requestId, { planId, expiresAt: expiresAt.toISOString() });

    return new Response(
      JSON.stringify({
        intent_token: intentToken,
        expires_at: expiresAt.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    secureLog("create-checkout-intent", "error", requestId, { error: errorMessage });
    
    return new Response(
      JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, ERROR_CODES.INTERNAL_ERROR.message, requestId)),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
