import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("Open_AI");

// Input validation schema
const inputSchema = z.object({
  resumeText: z.string().max(100000, "Resume text too long").optional(),
  linkedInUrl: z.string().url("Invalid LinkedIn URL").max(500).optional(),
  jobUrl: z.string().max(50000, "Job description too long").optional(),
  type: z.enum(["free", "premium"]).default("free"),
});

async function callOpenAI(systemPrompt: string, userPrompt: string, jsonMode = true) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
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
    const errorText = await response.text();
    console.error("OpenAI API error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Resposta vazia do modelo");
  }

  return JSON.parse(content);
}

async function summarizeResume(resumeText: string) {
  const systemPrompt = `Você é um especialista em análise de currículos. Extraia as informações principais do currículo e retorne em JSON estruturado.`;
  
  const userPrompt = `Analise o currículo abaixo e extraia em JSON:
{
  "cargo_atual": "",
  "anos_experiencia": 0,
  "habilidades_tecnicas": [],
  "habilidades_comportamentais": [],
  "formacao": [],
  "certificacoes": [],
  "idiomas": [],
  "experiencias_relevantes": []
}

Currículo:
${resumeText.slice(0, 4000)}`;

  return await callOpenAI(systemPrompt, userPrompt);
}

async function summarizeJob(jobText: string) {
  const systemPrompt = `Você é um especialista em análise de vagas. Extraia os requisitos principais da vaga e retorne em JSON estruturado.`;
  
  const userPrompt = `Analise a descrição da vaga abaixo e extraia em JSON:
{
  "titulo": "",
  "empresa": "",
  "nivel_senioridade": "",
  "requisitos_obrigatorios": [],
  "requisitos_desejaveis": [],
  "habilidades_tecnicas": [],
  "habilidades_comportamentais": [],
  "beneficios": [],
  "modelo_trabalho": ""
}

Vaga:
${jobText.slice(0, 4000)}`;

  return await callOpenAI(systemPrompt, userPrompt);
}

async function analyzeFit(
  resumeSummaryJson: any,
  jobSummaryJson: any,
  mode: "free" | "premium" = "free"
) {
  const systemPrompt = `
Você é um avaliador profissional de currículos e recrutador especializado em análise baseada em requisitos de vaga.

REGRAS:
- Baseie tudo APENAS nos JSONs resumidos do currículo e da vaga.
- Não invente dados.
- Seja direto e conciso.
- Se solicitado apenas o termômetro, não gere análise completa.

FORMATO DE RESPOSTA:

Para versão gratuita:

{
  "termometro_fit": 0,
  "justificativa_resumida": ""
}

Para versão premium:

{
  "termometro_fit": 0,
  "justificativa_resumida": "",
  "forcas": [],
  "fraquezas": [],
  "palavras_chave_faltantes": [],
  "riscos": [],
  "oportunidades_melhoria_curriculo": [],
  "explicacao_detalhada": ""
}
`;

  const userPrompt =
    mode === "free"
      ? `
Aqui estão os resumos em JSON.

Resumo do currículo:
${JSON.stringify(resumeSummaryJson)}

Resumo da vaga:
${JSON.stringify(jobSummaryJson)}

Gere apenas o JSON da versão gratuita (termometro_fit e justificativa_resumida).
`
      : `
Aqui estão os resumos em JSON.

Resumo do currículo:
${JSON.stringify(resumeSummaryJson)}

Resumo da vaga:
${JSON.stringify(jobSummaryJson)}

Gere o JSON completo da versão premium, seguindo exatamente o formato especificado no system prompt.
`;

  return await callOpenAI(systemPrompt, userPrompt);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input
    const rawInput = await req.json();
    const validationResult = inputSchema.safeParse(rawInput);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validationResult.error.errors.map(e => e.message) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { resumeText, linkedInUrl, jobUrl, type } = validationResult.data;

    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    // Ensure at least one resume input is provided
    if (!resumeText && !linkedInUrl) {
      return new Response(
        JSON.stringify({ error: "Either resumeText or linkedInUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get job description from URL or use provided text
    const jobText = jobUrl || "";
    const resumeContent = resumeText || `LinkedIn Profile: ${linkedInUrl}`;

    console.log("Starting analysis...", { type, hasResume: !!resumeText, hasLinkedIn: !!linkedInUrl });

    // 1) Summarize resume
    const resumeSummary = await summarizeResume(resumeContent);
    console.log("Resume summarized");

    // 2) Summarize job
    const jobSummary = await summarizeJob(jobText);
    console.log("Job summarized");

    // 3) Analyze fit
    const mode = type === "premium" ? "premium" : "free";
    const analysis = await analyzeFit(resumeSummary, jobSummary, mode);
    console.log("Analysis complete");

    // Map response to expected format
    const result = {
      score: analysis.termometro_fit,
      summary: analysis.justificativa_resumida,
      ...(mode === "premium" && {
        strengths: analysis.forcas,
        weaknesses: analysis.fraquezas,
        improvements: analysis.oportunidades_melhoria_curriculo,
        missingKeywords: analysis.palavras_chave_faltantes,
      }),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
