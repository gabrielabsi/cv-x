import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
1. NÃO INVENTE DADOS - Preserve TODAS as informações reais do currículo original (empresas, datas, cargos, formação, certificações)
2. NÃO ADICIONE certificações, empresas, cursos ou cargos que não existem no CV original
3. NÃO OMITA informações importantes do currículo original
4. APENAS melhore a clareza, impacto, concisão e formato ATS
5. Para quantificação sem números: use placeholders [X%], [R$X], [N]
6. MANTENHA TODAS as experiências profissionais listadas no original

DIRETRIZES DE REESCRITA:
- Use verbos de ação fortes no passado (Liderou, Implementou, Otimizou, Desenvolveu, Reduziu, Aumentou)
- Foque em resultados e impacto, não apenas responsabilidades
- Formato: AÇÃO + CONTEXTO + RESULTADO (quando possível)
- Evite jargões excessivos, mantenha clareza
- Otimize para ATS: use keywords relevantes para a área/vaga
- Mantenha bullets concisos (1-2 linhas máximo)
- Summary: 3-5 linhas impactantes destacando valor único
- INCLUA TODAS as experiências de trabalho do original

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
  "education": "Formação acadêmica completa",
  "certifications": ["Certificação 1", "Certificação 2"],
  "languages": ["Idioma 1 - Nível", "Idioma 2 - Nível"]
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

    logStep("Request received", { format, hasSessionId: !!sessionId, resumeLength: resumeText.length });

    // Use Lovable AI Gateway for better reliability
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    logStep("Calling Lovable AI Gateway for rewrite");

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
          { 
            role: "user", 
            content: `CURRÍCULO ORIGINAL:\n${resumeText}\n\nReescreva seguindo as regras. É FUNDAMENTAL que você inclua TODAS as experiências profissionais listadas no currículo original. Retorne APENAS o JSON.` 
          }
        ],
        temperature: 0.5, // Lower temperature for more consistent output
        max_tokens: 4000, // Increased for complete CVs
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      logStep("AI Gateway error", { status: aiResponse.status, error: errorText });
      
      if (aiResponse.status === 429) {
        throw new Error("Limite de requisições excedido. Tente novamente em alguns minutos.");
      }
      throw new Error("Erro ao processar currículo. Tente novamente.");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    logStep("AI response received", { responseLength: content.length });

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
      logStep("JSON parse error", { error: parseError, contentPreview: content.substring(0, 500) });
      throw new Error("Erro ao processar resposta. Tente novamente.");
    }

    // Validate required fields
    if (!rewriteContent.headline || !rewriteContent.summary || !rewriteContent.experience) {
      logStep("Missing required fields", { 
        hasHeadline: !!rewriteContent.headline,
        hasSummary: !!rewriteContent.summary,
        hasExperience: !!rewriteContent.experience
      });
      throw new Error("Currículo incompleto. Tente novamente.");
    }

    // Ensure arrays exist
    rewriteContent.skills = rewriteContent.skills || [];
    rewriteContent.certifications = rewriteContent.certifications || [];
    rewriteContent.languages = rewriteContent.languages || [];

    logStep("Rewrite content validated", { 
      experienceCount: rewriteContent.experience.length,
      skillsCount: rewriteContent.skills.length
    });

    // Generate HTML content for the document
    const htmlContent = generateHTMLContent(rewriteContent);

    logStep("Document generated successfully", { format, htmlLength: htmlContent.length });

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

interface RewriteContent {
  headline: string;
  summary: string;
  experience: Array<{ company: string; role: string; date: string; bullets: string[] }>;
  skills: string[];
  education: string;
  certifications?: string[];
  languages?: string[];
}

function generateHTMLContent(content: RewriteContent): string {
  const experienceHTML = content.experience.map(exp => `
    <div class="experience-item">
      <div class="role-line">
        <strong>${escapeHtml(exp.role)}</strong>
        <span class="date">${escapeHtml(exp.date)}</span>
      </div>
      <div class="company">${escapeHtml(exp.company)}</div>
      <ul>
        ${exp.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  const certificationsHTML = content.certifications && content.certifications.length > 0 
    ? `
      <h2>Certificações</h2>
      <ul class="certifications">
        ${content.certifications.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
      </ul>
    ` 
    : '';

  const languagesHTML = content.languages && content.languages.length > 0 
    ? `
      <h2>Idiomas</h2>
      <ul class="languages">
        ${content.languages.map(l => `<li>${escapeHtml(l)}</li>`).join('')}
      </ul>
    ` 
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Currículo Otimizado - CVX</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; }
      .footer { display: none; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 40px 30px;
      background: #fff;
    }
    h1 { 
      font-size: 26px; 
      color: #1a1a1a; 
      margin-bottom: 8px; 
      border-bottom: 2px solid #0066cc;
      padding-bottom: 8px;
    }
    h2 { 
      font-size: 13px; 
      text-transform: uppercase; 
      letter-spacing: 1px; 
      color: #0066cc; 
      border-bottom: 1px solid #0066cc; 
      padding-bottom: 4px; 
      margin: 20px 0 10px; 
    }
    .summary { 
      font-size: 14px; 
      color: #444; 
      margin-bottom: 16px; 
      line-height: 1.7;
      text-align: justify;
    }
    .experience-item { 
      margin-bottom: 16px; 
      page-break-inside: avoid;
    }
    .role-line { 
      display: flex; 
      justify-content: space-between; 
      align-items: baseline; 
      flex-wrap: wrap;
    }
    .role-line strong { 
      font-size: 15px; 
      color: #1a1a1a;
    }
    .date { 
      font-size: 13px; 
      color: #666; 
    }
    .company { 
      font-size: 13px; 
      color: #666; 
      margin-bottom: 6px; 
      font-style: italic;
    }
    ul { 
      padding-left: 18px; 
      margin: 0;
    }
    li { 
      font-size: 13px; 
      margin-bottom: 3px; 
      line-height: 1.5;
    }
    .skills { 
      display: flex; 
      flex-wrap: wrap; 
      gap: 6px; 
      list-style: none;
      padding: 0;
    }
    .skill { 
      background: #f0f7ff; 
      color: #0066cc; 
      padding: 4px 10px; 
      border-radius: 4px; 
      font-size: 12px;
      border: 1px solid #cce0ff;
    }
    .education { 
      font-size: 13px; 
      line-height: 1.6;
    }
    .certifications, .languages {
      list-style: none;
      padding: 0;
    }
    .certifications li, .languages li {
      font-size: 13px;
      padding: 2px 0;
    }
    .footer { 
      margin-top: 30px; 
      padding-top: 15px; 
      border-top: 1px solid #eee; 
      text-align: center; 
      font-size: 10px; 
      color: #999; 
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(content.headline)}</h1>
  
  <h2>Resumo Profissional</h2>
  <p class="summary">${escapeHtml(content.summary)}</p>
  
  <h2>Experiência Profissional</h2>
  ${experienceHTML}
  
  <h2>Competências</h2>
  <ul class="skills">
    ${content.skills.map(s => `<li class="skill">${escapeHtml(s)}</li>`).join('')}
  </ul>
  
  <h2>Formação Acadêmica</h2>
  <p class="education">${escapeHtml(content.education)}</p>
  
  ${certificationsHTML}
  ${languagesHTML}
  
  <div class="footer">
    Currículo otimizado por CVX - cvxapp.com
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
