import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  getCorsHeaders,
  createSecureError,
  secureLog,
  generateRequestId,
  ERROR_CODES,
} from "../_shared/security.ts";

const inputSchema = z.object({
  resumeText: z.string().max(100000).optional(),
  linkedInUrl: z.string().url().max(500).optional(),
  jobDescription: z.string().min(50).max(50000),
  type: z.enum(["free", "premium"]).optional().default("free"),
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
  const systemPrompt = `Extraia informações do currículo/perfil e retorne em JSON. Baseie-se APENAS no texto. NÃO invente.`;
  const userPrompt = `Analise e extraia: { "cargo_atual": "...", "anos_experiencia": "...", "habilidades_tecnicas": [...], "formacao": [...], "experiencias_relevantes": [...] }\n\nCurrículo:\n${resumeText.slice(0, 6000)}`;
  return await callOpenAI(systemPrompt, userPrompt, apiKey);
}

async function summarizeJob(jobText: string, apiKey: string) {
  const systemPrompt = `Extraia requisitos da vaga e retorne em JSON estruturado.`;
  const userPrompt = `Analise e extraia: { "titulo": "...", "empresa": "...", "requisitos_obrigatorios": [...], "habilidades_tecnicas": [...], "modelo_trabalho": "..." }\n\nVaga:\n${jobText.slice(0, 6000)}`;
  return await callOpenAI(systemPrompt, userPrompt, apiKey);
}

async function analyzeFit(resumeSummary: unknown, jobSummary: unknown, apiKey: string, mode: string) {
  const systemPrompt = `Você é um especialista em carreira. Avalie o FIT entre candidato e vaga. Seja objetivo e honesto.`;
  
  const userPrompt = mode === "free"
    ? `Compare e retorne JSON: { "termometro_fit": (0-100), "justificativa_resumida": "2-3 frases" }\n\nPerfil: ${JSON.stringify(resumeSummary)}\n\nVaga: ${JSON.stringify(jobSummary)}`
    : `Compare e retorne JSON: { "termometro_fit": (0-100), "justificativa_resumida": "...", "forcas": [...], "fraquezas": [...], "palavras_chave_faltantes": [...], "oportunidades_melhoria_curriculo": [...], "explicacao_detalhada": "..." }\n\nPerfil: ${JSON.stringify(resumeSummary)}\n\nVaga: ${JSON.stringify(jobSummary)}`;
  
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
    secureLog("analyze-resume", "started", requestId);

    const OPENAI_API_KEY = Deno.env.get("Open_AI");
    if (!OPENAI_API_KEY) {
      secureLog("analyze-resume", "missing_api_key", requestId);
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, ERROR_CODES.INTERNAL_ERROR.message, requestId)),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    
    const { resumeText, linkedInUrl, jobDescription, type } = validationResult.data;
    const isPremium = type === "premium";

    if (!resumeText && !linkedInUrl) {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INVALID_INPUT.code, "Currículo ou LinkedIn necessário", requestId)),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    secureLog("analyze-resume", "input_validated", requestId, { type, hasResume: !!resumeText });

    const resumeContent = resumeText || `LinkedIn: ${linkedInUrl}`;
    
    const resumeSummary = await summarizeResume(resumeContent, OPENAI_API_KEY);
    const jobSummary = await summarizeJob(jobDescription, OPENAI_API_KEY);
    const analysis = await analyzeFit(resumeSummary, jobSummary, OPENAI_API_KEY, isPremium ? "premium" : "free");

    secureLog("analyze-resume", "analysis_complete", requestId);

    const result = isPremium ? {
      score: analysis.termometro_fit,
      summary: analysis.justificativa_resumida,
      strengths: analysis.forcas,
      weaknesses: analysis.fraquezas,
      improvements: analysis.oportunidades_melhoria_curriculo,
      missingKeywords: analysis.palavras_chave_faltantes,
      detailedExplanation: analysis.explicacao_detalhada,
      risks: analysis.riscos,
      jobTitle: jobSummary.titulo || "Análise de Vaga",
      company: jobSummary.empresa || null,
    } : {
      score: analysis.termometro_fit,
      summary: analysis.justificativa_resumida,
      jobTitle: jobSummary.titulo || "Análise de Vaga",
      company: jobSummary.empresa || null,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    secureLog("analyze-resume", "error", requestId, { error: errorMessage });
    
    return new Response(
      JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, ERROR_CODES.INTERNAL_ERROR.message, requestId)),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
