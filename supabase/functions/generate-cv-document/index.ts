import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.20.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-CV-DOCUMENT] ${step}${detailsStr}`);
};

const REWRITE_PROMPT = `Você é um especialista em reescrita de currículos otimizados para ATS (Applicant Tracking Systems) e recrutadores humanos.

REGRAS ABSOLUTAS:
1. NÃO INVENTE DADOS - Preserve todas as informações reais do currículo original
2. NÃO ADICIONE certificações, empresas, cursos ou cargos que não existem
3. APENAS melhore a clareza, impacto, concisão e formato ATS
4. Use verbos de ação fortes no passado
5. Foque em resultados e impacto
6. Para quantificação sem números: use placeholders [X%], [R$X], [N]

Retorne APENAS um JSON válido com:
{
  "headline": "Título profissional",
  "summary": "Resumo de 3-5 linhas",
  "experience": [
    {
      "company": "Empresa",
      "role": "Cargo",
      "date": "Período",
      "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"]
    }
  ],
  "skills": ["Skill 1", "Skill 2"],
  "education": "Formação acadêmica"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { resumeText, format, sessionId } = await req.json();

    if (!resumeText || resumeText.trim().length < 100) {
      throw new Error("Texto do currículo é obrigatório");
    }

    if (!format || !["pdf", "docx"].includes(format)) {
      throw new Error("Formato deve ser 'pdf' ou 'docx'");
    }

    logStep("Request received", { format, hasSessionId: !!sessionId });

    const OPENAI_API_KEY = Deno.env.get("Open_AI");
    if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    logStep("Calling OpenAI for rewrite");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: REWRITE_PROMPT },
        { role: "user", content: `CURRÍCULO ORIGINAL:\n${resumeText}\n\nReescreva seguindo as regras e retorne APENAS o JSON.` }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    logStep("OpenAI response received");

    // Parse JSON from response
    let rewriteContent;
    try {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      rewriteContent = JSON.parse(jsonStr);
    } catch (parseError) {
      logStep("JSON parse error", { error: parseError });
      throw new Error("Erro ao processar resposta");
    }

    // Generate HTML content for the document
    const htmlContent = generateHTMLContent(rewriteContent);

    logStep("Document generated", { format });

    return new Response(JSON.stringify({
      success: true,
      rewrite: rewriteContent,
      html: htmlContent,
      format,
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

function generateHTMLContent(content: {
  headline: string;
  summary: string;
  experience: Array<{ company: string; role: string; date: string; bullets: string[] }>;
  skills: string[];
  education: string;
}): string {
  const experienceHTML = content.experience.map(exp => `
    <div class="experience-item">
      <div class="role-line">
        <strong>${exp.role}</strong>
        <span class="date">${exp.date}</span>
      </div>
      <div class="company">${exp.company}</div>
      <ul>
        ${exp.bullets.map(b => `<li>${b}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Currículo Otimizado - CVX</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 40px 30px;
    }
    h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 8px; }
    h2 { 
      font-size: 14px; 
      text-transform: uppercase; 
      letter-spacing: 1px; 
      color: #0066cc; 
      border-bottom: 2px solid #0066cc; 
      padding-bottom: 4px; 
      margin: 24px 0 12px; 
    }
    .summary { font-size: 15px; color: #444; margin-bottom: 20px; }
    .experience-item { margin-bottom: 20px; }
    .role-line { display: flex; justify-content: space-between; align-items: baseline; }
    .role-line strong { font-size: 16px; }
    .date { font-size: 14px; color: #666; }
    .company { font-size: 14px; color: #666; margin-bottom: 8px; }
    ul { padding-left: 20px; }
    li { font-size: 14px; margin-bottom: 4px; }
    .skills { display: flex; flex-wrap: wrap; gap: 8px; }
    .skill { 
      background: #f0f7ff; 
      color: #0066cc; 
      padding: 4px 12px; 
      border-radius: 4px; 
      font-size: 13px; 
    }
    .education { font-size: 14px; }
    .footer { 
      margin-top: 30px; 
      padding-top: 15px; 
      border-top: 1px solid #eee; 
      text-align: center; 
      font-size: 11px; 
      color: #999; 
    }
  </style>
</head>
<body>
  <h1>${content.headline}</h1>
  
  <h2>Resumo Profissional</h2>
  <p class="summary">${content.summary}</p>
  
  <h2>Experiência Profissional</h2>
  ${experienceHTML}
  
  <h2>Competências</h2>
  <div class="skills">
    ${content.skills.map(s => `<span class="skill">${s}</span>`).join('')}
  </div>
  
  <h2>Formação</h2>
  <p class="education">${content.education}</p>
  
  <div class="footer">
    Currículo otimizado por CVX - cvxapp.com
  </div>
</body>
</html>`;
}
