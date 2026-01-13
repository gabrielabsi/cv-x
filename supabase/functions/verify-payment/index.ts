import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  getCorsHeaders,
  createSecureError,
  secureLog,
  generateRequestId,
  ERROR_CODES,
} from "../_shared/security.ts";

const inputSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  resumeText: z.string().max(100000).optional(),
  linkedInUrl: z.string().url().max(500).optional(),
  jobDescription: z.string().min(50).max(50000),
});

async function callOpenAI(systemPrompt: string, userPrompt: string, apiKey: string, jsonMode = true) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(jsonMode && { response_format: { type: "json_object" } }),
    }),
  });

  if (!response.ok) {
    throw new Error("AI processing failed");
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response");
  return JSON.parse(content);
}

async function summarizeResume(resumeText: string, apiKey: string) {
  const systemPrompt = `Extraia informações do currículo e retorne JSON estruturado.`;
  const userPrompt = `Analise e extraia: { "cargo_atual": "...", "anos_experiencia": "...", "habilidades_tecnicas": [...], "formacao": [...], "experiencias_relevantes": [...] }\n\nCurrículo:\n${resumeText.slice(0, 6000)}`;
  return await callOpenAI(systemPrompt, userPrompt, apiKey);
}

async function summarizeJob(jobText: string, apiKey: string) {
  const systemPrompt = `Extraia requisitos da vaga e retorne JSON estruturado.`;
  const userPrompt = `Analise e extraia: { "titulo": "...", "empresa": "...", "requisitos_obrigatorios": [...], "habilidades_tecnicas": [...] }\n\nVaga:\n${jobText.slice(0, 6000)}`;
  return await callOpenAI(systemPrompt, userPrompt, apiKey);
}

async function analyzeFitPremium(resumeSummary: unknown, jobSummary: unknown, apiKey: string) {
  const systemPrompt = `Você é um avaliador profissional de currículos. Compare perfil e vaga, retornando análise detalhada.`;
  const userPrompt = `Compare e retorne JSON: { "termometro_fit": (0-100), "justificativa_resumida": "...", "forcas": [...], "fraquezas": [...], "palavras_chave_faltantes": [...], "oportunidades_melhoria_curriculo": [...], "vagas_sugeridas": [...], "explicacao_detalhada": "..." }\n\nPerfil: ${JSON.stringify(resumeSummary)}\n\nVaga: ${JSON.stringify(jobSummary)}`;
  return await callOpenAI(systemPrompt, userPrompt, apiKey);
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const requestId = generateRequestId();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    secureLog("verify-payment", "started", requestId);

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const OPENAI_API_KEY = Deno.env.get("Open_AI");
    
    if (!STRIPE_SECRET_KEY || !OPENAI_API_KEY) {
      secureLog("verify-payment", "missing_keys", requestId);
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, ERROR_CODES.INTERNAL_ERROR.message, requestId)),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.UNAUTHORIZED.code, ERROR_CODES.UNAUTHORIZED.message, requestId)),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      secureLog("verify-payment", "auth_failed", requestId);
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.UNAUTHORIZED.code, ERROR_CODES.UNAUTHORIZED.message, requestId)),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let rawInput;
    try {
      rawInput = await req.json();
    } catch {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INVALID_INPUT.code, "JSON inválido", requestId)),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validationResult = inputSchema.safeParse(rawInput);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INVALID_INPUT.code, "Dados inválidos", requestId)),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { sessionId, resumeText, linkedInUrl, jobDescription } = validationResult.data;

    if (!resumeText && !linkedInUrl) {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INVALID_INPUT.code, "Currículo ou LinkedIn necessário", requestId)),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify Stripe payment
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      secureLog("verify-payment", "payment_not_completed", requestId);
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.PAYMENT_REQUIRED.code, "Pagamento não concluído", requestId)),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = userData.user.email;
    if (session.customer_email !== userEmail && session.customer_details?.email !== userEmail) {
      secureLog("verify-payment", "email_mismatch", requestId);
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.FORBIDDEN.code, "Sessão não pertence a este usuário", requestId)),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    secureLog("verify-payment", "payment_verified", requestId);

    const resumeContent = resumeText || `LinkedIn: ${linkedInUrl}`;
    
    const resumeSummary = await summarizeResume(resumeContent, OPENAI_API_KEY);
    const jobSummary = await summarizeJob(jobDescription, OPENAI_API_KEY);
    const analysis = await analyzeFitPremium(resumeSummary, jobSummary, OPENAI_API_KEY);

    secureLog("verify-payment", "analysis_complete", requestId);

    return new Response(JSON.stringify({
      score: analysis.termometro_fit,
      summary: analysis.justificativa_resumida + (analysis.explicacao_detalhada ? "\n\n" + analysis.explicacao_detalhada : ""),
      strengths: analysis.forcas,
      weaknesses: analysis.fraquezas,
      improvements: analysis.oportunidades_melhoria_curriculo,
      missingKeywords: analysis.palavras_chave_faltantes,
      suggestedJobTitles: analysis.vagas_sugeridas,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    secureLog("verify-payment", "error", requestId, { error: errorMessage });
    
    return new Response(
      JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, ERROR_CODES.INTERNAL_ERROR.message, requestId)),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
