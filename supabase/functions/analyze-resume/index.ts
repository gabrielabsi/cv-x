import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText, linkedInUrl, jobUrl, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("API key not configured");
    }

    // Build concise prompt to minimize tokens
    const promptFree = `Analise currículo vs vaga. Retorne JSON:
{"score":0-100,"summary":"2 frases max"}

Currículo: ${resumeText ? resumeText.slice(0, 2000) : `LinkedIn: ${linkedInUrl}`}
Vaga URL: ${jobUrl}`;

    const promptPremium = `Analise currículo vs vaga detalhadamente. Retorne JSON:
{"score":0-100,"summary":"2 frases","strengths":["3 itens"],"weaknesses":["3 itens"],"improvements":["3 sugestões"],"missingKeywords":["5 palavras-chave faltantes"]}

Currículo: ${resumeText ? resumeText.slice(0, 3000) : `LinkedIn: ${linkedInUrl}`}
Vaga URL: ${jobUrl}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em RH e análise de currículos. Responda APENAS em JSON válido, sem markdown.",
          },
          {
            role: "user",
            content: type === "premium" ? promptPremium : promptFree,
          },
        ],
        temperature: 0.3,
        max_tokens: type === "premium" ? 800 : 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Entre em contato." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error("AI service error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse JSON from response
    let result;
    try {
      // Remove potential markdown code blocks
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      // Fallback response
      result = {
        score: 50,
        summary: "Não foi possível analisar completamente. Tente novamente.",
      };
    }

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
