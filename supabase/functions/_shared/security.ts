// Shared security utilities for edge functions

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Allowed domains for CORS and URL validation
const ALLOWED_ORIGINS = [
  "https://cvxapp.com",
  "https://www.cvxapp.com",
  "https://cvx.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

// Get CORS headers with origin validation
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith(".lovable.app")
  ) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Secure error response generator
export interface SecureErrorResponse {
  error: {
    code: string;
    message: string;
    request_id: string;
  };
}

export function createSecureError(
  code: string, 
  userMessage: string, 
  requestId: string
): SecureErrorResponse {
  return {
    error: {
      code,
      message: userMessage,
      request_id: requestId,
    },
  };
}

// Secure logging function - never logs sensitive data
export function secureLog(
  functionName: string,
  step: string,
  requestId: string,
  details?: Record<string, unknown>
): void {
  const safeDetails: Record<string, unknown> = {};
  
  if (details) {
    for (const [key, value] of Object.entries(details)) {
      // Sanitize sensitive fields
      if (['token', 'password', 'secret', 'key', 'authorization'].some(s => key.toLowerCase().includes(s))) {
        safeDetails[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 200) {
        safeDetails[key] = `[STRING:${value.length}chars]`;
      } else {
        safeDetails[key] = value;
      }
    }
  }
  
  console.log(JSON.stringify({
    function: functionName,
    step,
    request_id: requestId,
    timestamp: new Date().toISOString(),
    ...safeDetails,
  }));
}

// Hash function for rate limiting identifiers
export async function hashIdentifier(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

// Rate limiting check
export async function checkRateLimit(
  supabaseClient: SupabaseClient,
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMinutes: number
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  
  // Get current request count
  const { data: existing, error: fetchError } = await supabaseClient
    .from('rate_limits')
    .select('request_count')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Rate limit fetch error:', fetchError);
    // Allow on error to not block legitimate requests
    return { allowed: true, remaining: maxRequests };
  }

  const currentCount = existing?.request_count || 0;

  if (currentCount >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  // Increment or create rate limit record
  if (existing) {
    await supabaseClient
      .from('rate_limits')
      .update({ request_count: currentCount + 1 })
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart);
  } else {
    await supabaseClient
      .from('rate_limits')
      .insert({
        identifier,
        endpoint,
        request_count: 1,
        window_start: new Date().toISOString(),
      });
  }

  return { allowed: true, remaining: maxRequests - currentCount - 1 };
}

// Validate URL belongs to allowed domains
export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_ORIGINS.some(allowed => {
      const allowedParsed = new URL(allowed);
      return parsed.hostname === allowedParsed.hostname || 
             parsed.hostname.endsWith('.lovable.app');
    });
  } catch {
    return false;
  }
}

// Generate a secure request ID
export function generateRequestId(): string {
  return crypto.randomUUID();
}

// Soft validation for suspicious requests
export function isSuspiciousRequest(req: Request): { suspicious: boolean; reason?: string } {
  const userAgent = req.headers.get('user-agent') || '';
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  
  // Empty user agent is suspicious but not blocking
  if (!userAgent || userAgent.length < 10) {
    return { suspicious: true, reason: 'empty_or_short_ua' };
  }
  
  // Known bot patterns
  const botPatterns = ['curl/', 'wget/', 'python-requests/', 'libwww-perl'];
  if (botPatterns.some(p => userAgent.toLowerCase().includes(p))) {
    return { suspicious: true, reason: 'bot_user_agent' };
  }
  
  // Missing origin AND referer on non-OPTIONS is mildly suspicious
  if (req.method !== 'OPTIONS' && !origin && !referer) {
    return { suspicious: true, reason: 'no_origin_or_referer' };
  }
  
  return { suspicious: false };
}

// Create HMAC signature for intent tokens
export async function createHmacSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Verify HMAC signature
export async function verifyHmacSignature(data: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await createHmacSignature(data, secret);
  return signature === expectedSignature;
}

// Create Supabase client with service role for security operations
export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}

// Error code mapping for consistent responses
export const ERROR_CODES = {
  INVALID_INPUT: { code: 'INVALID_INPUT', status: 400, message: 'Dados inválidos' },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401, message: 'Autenticação necessária' },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403, message: 'Acesso negado' },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404, message: 'Recurso não encontrado' },
  RATE_LIMITED: { code: 'RATE_LIMITED', status: 429, message: 'Muitas requisições. Tente novamente em alguns minutos.' },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500, message: 'Erro interno. Tente novamente.' },
  PAYMENT_REQUIRED: { code: 'PAYMENT_REQUIRED', status: 402, message: 'Pagamento necessário' },
} as const;
