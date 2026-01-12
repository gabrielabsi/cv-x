import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.20.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ANALYZE-IMPROVEMENTS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { resumeText } = await req.json();

    if (!resumeText || resumeText.trim().length < 100) {
      throw new Error("Texto do currículo é obrigatório (mínimo 100 caracteres)");
    }

    logStep("Resume text received", { length: resumeText.length });

    const OPENAI_API_KEY = Deno.env.get("Open_AI");
    if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const prompt = `Analise este currículo e identifique exatamente 3 pontos principais de melhoria.

REGRAS:
- Seja específico e objetivo
- Foque em melhorias de alto impacto
- Cada ponto deve ter no máximo 2 frases
- Não invente informações sobre o candidato

CURRÍCULO:
${resumeText}

Responda APENAS com um JSON válido neste formato:
{
  "improvements": [
    {
      "title": "Título curto do ponto",
      "description": "Explicação breve da melhoria"
    }
  ],
  "overallScore": 70,
  "summary": "Uma frase resumindo a qualidade geral do currículo"
}`;

    logStep("Calling OpenAI");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "Você é um especialista em currículos e recrutamento. Responda sempre em JSON válido." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    logStep("OpenAI response received");

    // Parse JSON from response
    let result;
    try {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      logStep("JSON parse error", { error: parseError, content: content.substring(0, 500) });
      throw new Error("Erro ao processar resposta da análise");
    }

    logStep("Analysis complete", { improvements: result.improvements?.length });

    return new Response(JSON.stringify(result), {
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
