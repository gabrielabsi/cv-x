import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REWRITE-CV] ${step}${detailsStr}`);
};

const REWRITE_PROMPT = `Você é um especialista em reescrita de currículos otimizados para ATS (Applicant Tracking Systems) e recrutadores humanos.

REGRAS ABSOLUTAS:
1. NÃO INVENTE DADOS - Preserve todas as informações reais do currículo original (empresas, datas, cargos, formação)
2. NÃO ADICIONE certificações, empresas, cursos ou cargos que não existem no CV original
3. APENAS melhore a clareza, impacto, concisão e formato ATS
4. Se algo estiver faltando, sugira melhorias em "notes" - nunca invente
5. Para quantificação: use apenas números que o usuário forneceu. Se não houver números, use placeholders: [X%], [R$X], [N colaboradores], [N projetos]

DIRETRIZES DE REESCRITA:
- Use verbos de ação fortes no passado (Liderou, Implementou, Otimizou, Desenvolveu, Reduziu, Aumentou)
- Foque em resultados e impacto, não apenas responsabilidades
- Formato: AÇÃO + CONTEXTO + RESULTADO (quando possível)
- Evite jargões excessivos, mantenha clareza
- Otimize para ATS: use keywords relevantes para a área/vaga
- Mantenha bullets concisos (1-2 linhas máximo)
- Summary: 3-5 linhas impactantes destacando valor único

FORMATO DE OUTPUT (JSON válido):
{
  "headline": "Título profissional conciso e impactante",
  "summary": "Resumo profissional de 3-5 linhas",
  "experience": [
    {
      "company": "Nome da Empresa",
      "role": "Cargo",
      "date": "Período (mês/ano - mês/ano ou atual)",
      "bullets": ["Bullet 1 com resultado", "Bullet 2 com resultado", "Bullet 3 com resultado"]
    }
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "education": "Formação acadêmica formatada",
  "ats_keywords_added": ["keyword1", "keyword2"],
  "notes": ["Sugestão de melhoria 1", "Sugestão de melhoria 2"]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const { resumeText, jobDescription, targetRole, language } = await req.json();
    
    if (!resumeText || resumeText.trim().length < 100) {
      throw new Error("Texto do currículo é obrigatório (mínimo 100 caracteres)");
    }

    logStep("Request parsed", { 
      resumeLength: resumeText.length, 
      hasJobDescription: !!jobDescription,
      targetRole,
      language 
    });

    // Build the prompt
    let userPrompt = `CURRÍCULO ORIGINAL:\n${resumeText}\n\n`;
    
    if (jobDescription) {
      userPrompt += `DESCRIÇÃO DA VAGA (otimize keywords e alinhamento):\n${jobDescription}\n\n`;
    }
    
    if (targetRole) {
      userPrompt += `CARGO ALVO: ${targetRole}\n\n`;
    }
    
    userPrompt += `IDIOMA DE SAÍDA: ${language || 'pt-BR'}\n\n`;
    userPrompt += `Reescreva o currículo seguindo as regras e retorne APENAS o JSON válido.`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    logStep("Calling AI Gateway");
    
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
      const errorText = await aiResponse.text();
      logStep("AI Gateway error", { status: aiResponse.status, error: errorText });
      
      if (aiResponse.status === 429) {
        throw new Error("Limite de requisições excedido. Tente novamente em alguns minutos.");
      }
      if (aiResponse.status === 402) {
        throw new Error("Créditos de IA esgotados. Entre em contato com o suporte.");
      }
      throw new Error("Erro ao processar currículo. Tente novamente.");
    }

    const aiData = await aiResponse.json();
    logStep("AI response received");

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    // Parse JSON from response (handle markdown code blocks)
    let rewriteContent;
    try {
      let jsonStr = content;
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      rewriteContent = JSON.parse(jsonStr);
    } catch (parseError) {
      logStep("JSON parse error", { error: parseError, content: content.substring(0, 500) });
      throw new Error("Erro ao processar resposta. Tente novamente.");
    }

    logStep("Rewrite content parsed successfully");

    // Save to database
    const { data: savedRewrite, error: saveError } = await supabaseClient
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

    if (saveError) {
      logStep("Save error", { error: saveError });
      // Continue even if save fails - still return the result
    } else {
      logStep("Rewrite saved", { rewriteId: savedRewrite.id });
    }

    // Record credit transaction
    const { error: transactionError } = await supabaseClient
      .from("credit_transactions")
      .insert({
        user_id: user.id,
        type: "consume",
        amount: 1,
        feature: "cv_rewrite",
        description: targetRole ? `Reescrita para: ${targetRole}` : "Reescrita de currículo",
      });

    if (transactionError) {
      logStep("Transaction error", { error: transactionError });
    }

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
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
