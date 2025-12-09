import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("Open_AI");
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

const inputSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  resumeText: z.string().max(100000, "Resume text too long").optional(),
  linkedInUrl: z.string().url("Invalid LinkedIn URL").max(500).optional(),
  jobDescription: z.string().min(50, "Job description too short").max(50000, "Job description too long"),
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

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
  const systemPrompt = `Você é um especialista em análise de currículos. Extraia as informações principais do currículo/perfil fornecido e retorne em JSON estruturado.`;
  
  const userPrompt = `Analise o conteúdo do currículo/perfil abaixo e extraia as informações em JSON:

{
  "cargo_atual": "título do cargo atual ou mais recente",
  "anos_experiencia": "número estimado de anos de experiência",
  "habilidades_tecnicas": ["lista de habilidades técnicas identificadas"],
  "habilidades_comportamentais": ["soft skills identificadas"],
  "formacao": ["formação acadêmica"],
  "certificacoes": ["certificações mencionadas"],
  "idiomas": ["idiomas"],
  "experiencias_relevantes": ["principais experiências e conquistas"]
}

Conteúdo do currículo/perfil:
${resumeText.slice(0, 6000)}`;

  return await callOpenAI(systemPrompt, userPrompt);
}

async function summarizeJob(jobText: string) {
  const systemPrompt = `Você é um especialista em análise de vagas de emprego. Extraia os requisitos e informações principais da vaga e retorne em JSON estruturado.`;
  
  const userPrompt = `Analise a descrição da vaga abaixo e extraia as informações em JSON:

{
  "titulo": "título da vaga",
  "empresa": "nome da empresa se mencionado",
  "nivel_senioridade": "júnior/pleno/sênior/especialista",
  "requisitos_obrigatorios": ["requisitos obrigatórios/mandatórios"],
  "requisitos_desejaveis": ["requisitos desejáveis/diferenciais"],
  "habilidades_tecnicas": ["tecnologias, ferramentas, linguagens exigidas"],
  "habilidades_comportamentais": ["soft skills mencionadas"],
  "responsabilidades": ["principais responsabilidades do cargo"],
  "modelo_trabalho": "remoto/híbrido/presencial"
}

Descrição da vaga:
${jobText.slice(0, 6000)}`;

  return await callOpenAI(systemPrompt, userPrompt);
}

async function analyzeFitPremium(resumeSummaryJson: any, jobSummaryJson: any) {
  const systemPrompt = `Você é um avaliador profissional de currículos e recrutador especializado com mais de 15 anos de experiência. Sua tarefa é comparar o perfil do candidato com os requisitos da vaga e gerar uma análise de compatibilidade EXTREMAMENTE detalhada e completa.

REGRAS IMPORTANTES:
- Base sua análise APENAS nos dados fornecidos nos JSONs
- O termômetro de fit (0-100) deve refletir a compatibilidade real
- Seja honesto mas construtivo nas avaliações
- Forneça análises DETALHADAS e ACIONÁVEIS, não genéricas
- Cada ponto deve ter pelo menos 2 frases explicando o contexto

CRITÉRIOS DE PONTUAÇÃO:
- 80-100: Excelente fit - candidato atende maioria dos requisitos obrigatórios e vários desejáveis
- 60-79: Bom fit - candidato atende requisitos principais, pode precisar de algumas adaptações
- 40-59: Fit moderado - candidato atende alguns requisitos, mas tem gaps significativos
- 20-39: Fit baixo - candidato atende poucos requisitos, precisaria de muito desenvolvimento
- 0-19: Fit muito baixo - perfil muito diferente do exigido`;

  const userPrompt = `Compare detalhadamente o perfil do candidato com a vaga e retorne este JSON completo. SEJA MUITO DETALHADO em cada campo:

{
  "termometro_fit": (número de 0 a 100),
  "justificativa_resumida": "(4-6 frases detalhadas explicando a compatibilidade geral, mencionando pontos específicos do currículo que se alinham ou não com a vaga. Inclua contexto sobre a senioridade esperada e como o candidato se encaixa.)",
  "forcas": [
    "(ponto forte 1 - pelo menos 2 frases explicando como essa força beneficia o candidato para esta vaga específica)",
    "(ponto forte 2 - contextualize com exemplos do currículo)",
    "(ponto forte 3 - relacione com requisitos da vaga)",
    "(ponto forte 4 - se aplicável)",
    "(ponto forte 5 - se aplicável)"
  ],
  "fraquezas": [
    "(gap 1 - explique o impacto dessa lacuna e como pode afetar a candidatura)",
    "(gap 2 - seja específico sobre o que está faltando e por que é importante)",
    "(gap 3 - se aplicável)",
    "(gap 4 - se aplicável)"
  ],
  "palavras_chave_faltantes": ["termo 1", "termo 2", "termo 3", "etc - liste TODAS as habilidades, tecnologias ou termos importantes da vaga que não aparecem no currículo"],
  "oportunidades_melhoria_curriculo": [
    "(sugestão 1 - seja específico sobre O QUE adicionar e ONDE no currículo, com exemplos de redação)",
    "(sugestão 2 - explique como reformular experiências existentes para destacar competências relevantes)",
    "(sugestão 3 - sugira cursos, certificações ou projetos que agregariam valor)",
    "(sugestão 4 - dicas de formatação ou estrutura se aplicável)",
    "(sugestão 5 - outras melhorias práticas)"
  ],
  "vagas_sugeridas": [
    "(título de vaga 1 mais adequado ao perfil atual do candidato)",
    "(título de vaga 2 que aproveitaria melhor as experiências do candidato)",
    "(título de vaga 3 alternativa interessante)",
    "(título de vaga 4 em área correlata)",
    "(título de vaga 5 para crescimento de carreira)"
  ],
  "explicacao_detalhada": "(2-3 parágrafos completos explicando a análise em profundidade. Discuta: 1) Como o background do candidato se relaciona com a posição, 2) Os principais diferenciais competitivos, 3) As áreas que precisam de desenvolvimento, 4) Uma avaliação realista das chances e 5) Recomendações finais para o candidato.)"
}

PERFIL DO CANDIDATO:
${JSON.stringify(resumeSummaryJson, null, 2)}

REQUISITOS DA VAGA:
${JSON.stringify(jobSummaryJson, null, 2)}`;

  return await callOpenAI(systemPrompt, userPrompt);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Validate environment
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("User not authenticated");
    }
    logStep("User authenticated", { userId: userData.user.id });

    // Parse and validate input
    const rawInput = await req.json();
    const validationResult = inputSchema.safeParse(rawInput);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validationResult.error.errors.map(e => e.message) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { sessionId, resumeText, linkedInUrl, jobDescription } = validationResult.data;

    // Ensure at least one resume input is provided
    if (!resumeText && !linkedInUrl) {
      return new Response(
        JSON.stringify({ error: "Either resumeText or linkedInUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CRITICAL: Verify payment with Stripe
    logStep("Verifying Stripe session", { sessionId });
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { status: session.payment_status, mode: session.mode });

    // Verify payment was successful
    if (session.payment_status !== "paid") {
      logStep("Payment not completed", { status: session.payment_status });
      return new Response(
        JSON.stringify({ error: "Payment not completed" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the session belongs to this user (by email)
    const userEmail = userData.user.email;
    if (session.customer_email !== userEmail && session.customer_details?.email !== userEmail) {
      logStep("Session email mismatch", { 
        sessionEmail: session.customer_email || session.customer_details?.email, 
        userEmail 
      });
      return new Response(
        JSON.stringify({ error: "Session does not belong to this user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Payment verified successfully");

    // Now generate premium analysis
    const resumeContent = resumeText || `LinkedIn Profile URL: ${linkedInUrl}\n\nNOTA: Analise com base no perfil típico de um profissional com este LinkedIn.`;

    logStep("Starting premium analysis");

    const resumeSummary = await summarizeResume(resumeContent);
    logStep("Resume summarized");

    const jobSummary = await summarizeJob(jobDescription);
    logStep("Job summarized");

    const analysis = await analyzeFitPremium(resumeSummary, jobSummary);
    logStep("Analysis complete");

    const result = {
      score: analysis.termometro_fit,
      summary: analysis.justificativa_resumida + (analysis.explicacao_detalhada ? "\n\n" + analysis.explicacao_detalhada : ""),
      strengths: analysis.forcas,
      weaknesses: analysis.fraquezas,
      improvements: analysis.oportunidades_melhoria_curriculo,
      missingKeywords: analysis.palavras_chave_faltantes,
      suggestedJobTitles: analysis.vagas_sugeridas,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
