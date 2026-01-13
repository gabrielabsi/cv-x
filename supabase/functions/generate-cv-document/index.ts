import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  getCorsHeaders,
  createSecureError,
  secureLog,
  generateRequestId,
  ERROR_CODES,
} from "../_shared/security.ts";

const REWRITE_PROMPT = `Você é um especialista em reescrita de currículos otimizados para ATS.

REGRAS:
1. NÃO INVENTE DADOS - Preserve TODAS as informações reais
2. NÃO ADICIONE informações que não existem
3. NÃO OMITA informações importantes
4. APENAS melhore clareza, impacto e formato ATS
5. MANTENHA TODAS as experiências profissionais

Retorne APENAS JSON:
{
  "headline": "Título profissional",
  "summary": "Resumo de 3-5 linhas",
  "experience": [{"company": "...", "role": "...", "date": "...", "bullets": ["..."]}],
  "skills": ["..."],
  "education": "...",
  "certifications": ["..."],
  "languages": ["..."]
}`;

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const requestId = generateRequestId();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    secureLog("generate-cv-document", "started", requestId);

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INVALID_INPUT.code, "JSON inválido", requestId)),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { resumeText, format, sessionId } = body;

    if (!resumeText || resumeText.trim().length < 100) {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INVALID_INPUT.code, "Texto do currículo muito curto", requestId)),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!format || !["pdf", "docx"].includes(format)) {
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INVALID_INPUT.code, "Formato deve ser 'pdf' ou 'docx'", requestId)),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    secureLog("generate-cv-document", "input_validated", requestId, { format, hasSessionId: !!sessionId });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      secureLog("generate-cv-document", "missing_api_key", requestId);
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
          { 
            role: "user", 
            content: `CURRÍCULO:\n${resumeText}\n\nInclua TODAS as experiências. Retorne APENAS JSON.` 
          }
        ],
        temperature: 0.5,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      secureLog("generate-cv-document", "ai_error", requestId, { status: aiResponse.status });
      
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
      secureLog("generate-cv-document", "parse_error", requestId);
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, "Erro ao processar. Tente novamente.", requestId)),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!rewriteContent.headline || !rewriteContent.summary || !rewriteContent.experience) {
      secureLog("generate-cv-document", "incomplete_response", requestId);
      return new Response(
        JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, "Currículo incompleto. Tente novamente.", requestId)),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    rewriteContent.skills = rewriteContent.skills || [];
    rewriteContent.certifications = rewriteContent.certifications || [];
    rewriteContent.languages = rewriteContent.languages || [];

    const htmlContent = generateHTMLContent(rewriteContent);

    secureLog("generate-cv-document", "completed", requestId, { 
      experienceCount: rewriteContent.experience.length 
    });

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
    secureLog("generate-cv-document", "error", requestId, { error: errorMessage });
    
    return new Response(
      JSON.stringify(createSecureError(ERROR_CODES.INTERNAL_ERROR.code, ERROR_CODES.INTERNAL_ERROR.message, requestId)),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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

// Enhanced HTML escaping to prevent XSS
function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#x60;')
    .replace(/\//g, '&#x2F;');
}

// Strip any potentially dangerous patterns
function sanitizeText(text: string): string {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

function generateHTMLContent(content: RewriteContent): string {
  const experienceHTML = content.experience.map(exp => `
    <div class="experience-item">
      <div class="role-line">
        <strong>${sanitizeText(exp.role)}</strong>
        <span class="date">${sanitizeText(exp.date)}</span>
      </div>
      <div class="company">${sanitizeText(exp.company)}</div>
      <ul>
        ${exp.bullets.map(b => `<li>${sanitizeText(b)}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  const certificationsHTML = content.certifications && content.certifications.length > 0 
    ? `<h2>Certificações</h2><ul class="certifications">${content.certifications.map(c => `<li>${sanitizeText(c)}</li>`).join('')}</ul>` 
    : '';

  const languagesHTML = content.languages && content.languages.length > 0 
    ? `<h2>Idiomas</h2><ul class="languages">${content.languages.map(l => `<li>${sanitizeText(l)}</li>`).join('')}</ul>` 
    : '';

  // Document-only HTML - no scripts, no event handlers
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
  <title>Currículo Otimizado - CVX</title>
  <style>
    @media print { body { margin: 0; padding: 20px; } .footer { display: none; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px 30px; background: #fff; }
    h1 { font-size: 26px; color: #1a1a1a; margin-bottom: 8px; border-bottom: 2px solid #0066cc; padding-bottom: 8px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #0066cc; border-bottom: 1px solid #0066cc; padding-bottom: 4px; margin: 20px 0 10px; }
    .summary { font-size: 14px; color: #444; margin-bottom: 16px; line-height: 1.7; text-align: justify; }
    .experience-item { margin-bottom: 16px; page-break-inside: avoid; }
    .role-line { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; }
    .role-line strong { font-size: 15px; color: #1a1a1a; }
    .date { font-size: 13px; color: #666; }
    .company { font-size: 13px; color: #666; margin-bottom: 6px; font-style: italic; }
    ul { padding-left: 18px; margin: 0; }
    li { font-size: 13px; margin-bottom: 3px; line-height: 1.5; }
    .skills { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; padding: 0; }
    .skill { background: #f0f7ff; color: #0066cc; padding: 4px 10px; border-radius: 4px; font-size: 12px; border: 1px solid #cce0ff; }
    .education { font-size: 13px; line-height: 1.6; }
    .certifications, .languages { list-style: none; padding: 0; }
    .certifications li, .languages li { font-size: 13px; padding: 2px 0; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #999; }
  </style>
</head>
<body>
  <h1>${sanitizeText(content.headline)}</h1>
  <h2>Resumo Profissional</h2>
  <p class="summary">${sanitizeText(content.summary)}</p>
  <h2>Experiência Profissional</h2>
  ${experienceHTML}
  <h2>Competências</h2>
  <ul class="skills">${content.skills.map(s => `<li class="skill">${sanitizeText(s)}</li>`).join('')}</ul>
  <h2>Formação Acadêmica</h2>
  <p class="education">${sanitizeText(content.education)}</p>
  ${certificationsHTML}
  ${languagesHTML}
  <div class="footer">Currículo otimizado por CVX - cvxapp.com</div>
</body>
</html>`;
}
