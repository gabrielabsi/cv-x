import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  getCorsHeaders,
  createSecureError,
  secureLog,
  generateRequestId,
  ERROR_CODES,
} from "../_shared/security.ts";

const REWRITE_PROMPT = `Você é um especialista em reescrita de currículos otimizados para ATS (Applicant Tracking Systems) e recrutadores humanos.

REGRAS ABSOLUTAS:
1. NÃO INVENTE DADOS - Preserve todas as informações reais do currículo original
2. NÃO ADICIONE certificações, empresas, cursos ou cargos que não existem no CV original
3. APENAS melhore a clareza, impacto, concisão e formato ATS
4. Para quantificação sem números: use placeholders [X%], [R$X], [N]

DIRETRIZES:
- Use verbos de ação fortes no passado
- Foque em resultados e impacto
- Formato: AÇÃO + CONTEXTO + RESULTADO
- Otimize para ATS: use keywords relevantes
- Mantenha bullets concisos (1-2 linhas)
- Summary: 3-5 linhas impactantes

FORMATO DE OUTPUT (JSON):
{
  "headline": "Título profissional",
  "summary": "Resumo de 3-5 linhas",
  "experience": [{"company": "Empresa", "role": "Cargo", "date": "Período", "bullets": ["..."]}],
  "skills": ["Skill 1", "Skill 2"],
  "education": "Formação acadêmica",
  "ats_keywords_added": ["keyword1"],
  "notes": ["Sugestão 1"]
}`;

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
    secureLog("rewrite-cv", "started", requestId);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.UNAUTHORIZED.code, ERROR_CODES.UNAUTHORIZED.message, requestId)),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user?.id) {
      secureLog("rewrite-cv", "auth_failed", requestId);
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.UNAUTHORIZED.code, ERROR_CODES.UNAUTHORIZED.message, requestId)),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = userData.user;
    secureLog("rewrite-cv", "authenticated", requestId, { userId: user.id });

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INVALID_INPUT.code, "JSON inválido", requestId)),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { resumeText, jobDescription, targetRole, language } = body;
    
    if (!resumeText || resumeText.trim().length < 100) {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INVALID_INPUT.code, "Texto do currículo muito curto (mínimo 100 caracteres)", requestId)),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    secureLog("rewrite-cv", "input_validated", requestId, { 
      resumeLength: resumeText.length, 
      hasJobDescription: !!jobDescription 
    });

    let userPrompt = `CURRÍCULO ORIGINAL:\n${resumeText}\n\n`;
    if (jobDescription) userPrompt += `DESCRIÇÃO DA VAGA:\n${jobDescription}\n\n`;
    if (targetRole) userPrompt += `CARGO ALVO: ${targetRole}\n\n`;
    userPrompt += `IDIOMA: ${language || 'pt-BR'}\n\nRetorne APENAS o JSON.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      secureLog("rewrite-cv", "missing_api_key", requestId);
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, ERROR_CODES.INTERNAL_ERROR.message, requestId)),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: REWRITE_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      secureLog("rewrite-cv", "ai_error", requestId, { status: aiResponse.status });
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify(createSecureError(ERROR_CODES.RATE_LIMITED.code, ERROR_CODES.RATE_LIMITED.message, requestId)),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, "Erro ao processar. Tente novamente.", requestId)),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, "Resposta vazia. Tente novamente.", requestId)),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let rewriteContent;
    try {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();
      rewriteContent = JSON.parse(jsonStr);
    } catch {
      secureLog("rewrite-cv", "parse_error", requestId);
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, "Erro ao processar. Tente novamente.", requestId)),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: savedRewrite } = await supabaseClient
      .from("cv_rewrites")
      .insert({
        user_id: user.id,
        original_cv_text: resumeText,
        job_description_text: jobDescription || null,
        target_role: targetRole || null,
        language: language || "pt-BR",
        rewrite_content: rewriteContent,
      })
      .select()
      .single();

    await supabaseClient.from("credit_transactions").insert({
      user_id: user.id,
      type: "consume",
      amount: 1,
      feature: "cv_rewrite",
      description: targetRole ? `Reescrita para: ${targetRole}` : "Reescrita de currículo",
    });

    secureLog("rewrite-cv", "completed", requestId, { rewriteId: savedRewrite?.id });

    return new Response(JSON.stringify({
      success: true,
      rewrite: rewriteContent,
      rewriteId: savedRewrite?.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    secureLog("rewrite-cv", "error", requestId, { error: errorMessage });
    
    return new Response(
      JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, ERROR_CODES.INTERNAL_ERROR.message, requestId)),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
