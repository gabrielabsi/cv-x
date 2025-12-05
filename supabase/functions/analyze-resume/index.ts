import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("Open_AI");

// Input validation schema - free analysis only (premium handled by verify-payment)
const inputSchema = z.object({
  resumeText: z.string().max(100000, "Resume text too long").optional(),
  linkedInUrl: z.string().url("Invalid LinkedIn URL").max(500).optional(),
  jobDescription: z.string().min(50, "Job description too short").max(50000, "Job description too long"),
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
  const systemPrompt = `Você é um especialista em análise de currículos. Extraia as informações principais do currículo/perfil fornecido e retorne em JSON estruturado. Se receber apenas uma URL de LinkedIn, faça uma análise baseada em informações típicas de perfis profissionais.`;
  
  const userPrompt = `Analise o conteúdo do currículo/perfil abaixo e extraia as informações em JSON. Se algumas informações não estiverem disponíveis, faça inferências razoáveis baseadas no contexto:

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

async function analyzeFit(
  resumeSummaryJson: any,
  jobSummaryJson: any,
  mode: "free" | "premium" = "free"
) {
  const systemPrompt = `Você é um avaliador profissional de currículos e recrutador especializado. Sua tarefa é comparar o perfil do candidato com os requisitos da vaga e gerar uma análise de compatibilidade.

REGRAS IMPORTANTES:
- Base sua análise APENAS nos dados fornecidos nos JSONs
- O termômetro de fit (0-100) deve refletir a compatibilidade real
- Seja honesto mas construtivo nas avaliações
- Se houver poucas informações, faça uma avaliação conservadora mas útil

CRITÉRIOS DE PONTUAÇÃO:
- 80-100: Excelente fit - candidato atende maioria dos requisitos obrigatórios e vários desejáveis
- 60-79: Bom fit - candidato atende requisitos principais, pode precisar de algumas adaptações
- 40-59: Fit moderado - candidato atende alguns requisitos, mas tem gaps significativos
- 20-39: Fit baixo - candidato atende poucos requisitos, precisaria de muito desenvolvimento
- 0-19: Fit muito baixo - perfil muito diferente do exigido`;

  const userPrompt = mode === "free"
    ? `Compare o perfil do candidato com a vaga e retorne APENAS este JSON:

{
  "termometro_fit": (número de 0 a 100),
  "justificativa_resumida": "(2-3 frases explicando o score de forma construtiva)"
}

PERFIL DO CANDIDATO:
${JSON.stringify(resumeSummaryJson, null, 2)}

REQUISITOS DA VAGA:
${JSON.stringify(jobSummaryJson, null, 2)}`
    : `Compare detalhadamente o perfil do candidato com a vaga e retorne este JSON completo:

{
  "termometro_fit": (número de 0 a 100),
  "justificativa_resumida": "(2-3 frases resumindo a compatibilidade)",
  "forcas": ["pontos fortes do candidato para esta vaga - mínimo 3 itens"],
  "fraquezas": ["gaps ou pontos a desenvolver - mínimo 2 itens"],
  "palavras_chave_faltantes": ["termos/habilidades da vaga ausentes no currículo"],
  "riscos": ["possíveis objeções que recrutadores podem ter"],
  "oportunidades_melhoria_curriculo": ["sugestões práticas para melhorar o currículo para esta vaga"],
  "explicacao_detalhada": "(parágrafo detalhado explicando a análise)"
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
    
    const { resumeText, linkedInUrl, jobDescription } = validationResult.data;

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

    // Use job description directly (not a URL anymore)
    const jobText = jobDescription;
    const resumeContent = resumeText || `LinkedIn Profile URL: ${linkedInUrl}\n\nNOTA: Analise com base no perfil típico de um profissional com este LinkedIn. Se não conseguir acessar, forneça uma análise genérica baseada no cargo mencionado na vaga.`;

    console.log("Starting free analysis...", { hasResume: !!resumeText, hasLinkedIn: !!linkedInUrl });

    // 1) Summarize resume
    const resumeSummary = await summarizeResume(resumeContent);
    console.log("Resume summarized");

    // 2) Summarize job
    const jobSummary = await summarizeJob(jobText);
    console.log("Job summarized");

    // 3) Analyze fit - always free mode (premium handled by verify-payment endpoint)
    const analysis = await analyzeFit(resumeSummary, jobSummary, "free");
    console.log("Analysis complete");

    // Map response to expected format (free tier only)
    const result = {
      score: analysis.termometro_fit,
      summary: analysis.justificativa_resumida,
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
