import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonInputSchema = z.object({
  text: z.string().max(100000, "Text too long").optional().default(""),
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = [".pdf", ".docx"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let text = "";
    
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      
      if (!file) {
        return new Response(
          JSON.stringify({ error: "No file provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return new Response(
          JSON.stringify({ error: "File too large. Maximum size is 10MB" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fileName = file.name.toLowerCase();
      
      if (!ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
        return new Response(
          JSON.stringify({ error: "Invalid file type. Only PDF and DOCX files are allowed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      console.log(`Processing file: ${fileName}, size: ${file.size} bytes`);

      if (fileName.endsWith(".pdf")) {
        // Prefer deterministic extraction first (no external API), then fallback if needed
        text = await extractPdfText(bytes, fileName);
      } else if (fileName.endsWith(".docx")) {
        text = await extractDocxText(bytes);
      }

      text = cleanText(text);

      if (text.length > 50000) {
        text = text.slice(0, 50000);
      }

      console.log(`Extracted ${text.length} characters from file`);

      // If we couldn't get meaningful text, fail explicitly so the UI can guide the user.
      if (text.length < 200) {
        return new Response(
          JSON.stringify({
            error:
              "Não foi possível extrair texto suficiente do PDF/DOCX. Se for um PDF escaneado (imagem), envie um DOCX ou cole o texto do currículo.",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      const rawBody = await req.json();
      const validationResult = jsonInputSchema.safeParse(rawBody);

      if (!validationResult.success) {
        return new Response(
          JSON.stringify({ error: "Invalid input", details: validationResult.error.errors.map((e) => e.message) }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      text = validationResult.data.text;
    }

    console.log(`Returning text with ${text.length} characters`);
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Extract error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao extrair texto";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

async function extractPdfTextWithPdfJs(bytes: Uint8Array): Promise<string> {
  try {
    const pdfjsLib = await import(
      "https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs?target=deno",
    );

    const loadingTask = (pdfjsLib as any).getDocument({ data: bytes, disableWorker: true } as any);
    const pdf = await loadingTask.promise;

    const maxPages = Math.min(pdf.numPages ?? 1, 25);
    const pages: string[] = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = (content.items ?? [])
        .map((item: any) => (typeof item?.str === "string" ? item.str : ""))
        .join(" ")
        .replace(/[ ]{2,}/g, " ")
        .trim();

      if (pageText) pages.push(pageText);
    }

    return pages.join("\n\n");
  } catch (e) {
    console.error("PDF.js extraction error:", e);
    return "";
  }
}

async function extractPdfText(bytes: Uint8Array, fileName: string): Promise<string> {
  // 1) Deterministic extraction first (most reliable for text-based PDFs)
  console.log("Extracting PDF text with PDF.js...", { fileName });
  const pdfJsText = await extractPdfTextWithPdfJs(bytes);
  console.log("PDF.js extracted chars:", pdfJsText.length);

  if (pdfJsText.length >= 200) return pdfJsText;

  // 2) If PDF is image-based / unusual, try OpenAI assistants as a fallback
  const openAIApiKey = Deno.env.get("Open_AI");
  if (openAIApiKey) {
    console.log("PDF.js returned too little text; trying OpenAI assistant fallback...");
    const assistantText = await extractPdfWithAssistant(bytes, openAIApiKey);
    if (assistantText.length >= 200) return assistantText;
  } else {
    console.error("OpenAI API key not found (Open_AI)");
  }

  // 3) Last-resort heuristic
  return fallbackPdfExtraction(bytes);
}

async function extractPdfWithAssistant(bytes: Uint8Array, apiKey: string): Promise<string> {
  try {
    // First, upload the file to OpenAI
    const formData = new FormData();
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
    formData.append("file", blob, "resume.pdf");
    formData.append("purpose", "assistants");

    console.log("Uploading PDF to OpenAI Files API...");
    
    const uploadResponse = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("File upload error:", errorText);
      return fallbackPdfExtraction(bytes);
    }

    const uploadData = await uploadResponse.json();
    const fileId = uploadData.id;
    console.log(`File uploaded with ID: ${fileId}`);

    // Create an assistant with file search capability
    const assistantResponse = await fetch("https://api.openai.com/v1/assistants", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({
        name: "PDF Text Extractor",
        instructions: "Você extrai texto de documentos PDF. Retorne apenas o texto extraído sem formatação adicional.",
        model: "gpt-4o-mini",
        tools: [{ type: "file_search" }],
      }),
    });

    if (!assistantResponse.ok) {
      console.error("Assistant creation error");
      // Clean up: delete the file
      await deleteOpenAIFile(fileId, apiKey);
      return fallbackPdfExtraction(bytes);
    }

    const assistant = await assistantResponse.json();
    const assistantId = assistant.id;

    // Create a thread with the file
    const threadResponse = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "Extraia todo o texto deste documento PDF. Retorne apenas o texto extraído, mantendo a estrutura original.",
            attachments: [
              {
                file_id: fileId,
                tools: [{ type: "file_search" }],
              },
            ],
          },
        ],
      }),
    });

    if (!threadResponse.ok) {
      console.error("Thread creation error");
      await deleteOpenAIFile(fileId, apiKey);
      await deleteOpenAIAssistant(assistantId, apiKey);
      return fallbackPdfExtraction(bytes);
    }

    const thread = await threadResponse.json();
    const threadId = thread.id;

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({
        assistant_id: assistantId,
      }),
    });

    if (!runResponse.ok) {
      console.error("Run creation error");
      await deleteOpenAIFile(fileId, apiKey);
      await deleteOpenAIAssistant(assistantId, apiKey);
      return fallbackPdfExtraction(bytes);
    }

    const run = await runResponse.json();
    const runId = run.id;

    // Poll for completion
    let attempts = 0;
    let runStatus = run.status;
    
    while (runStatus !== "completed" && runStatus !== "failed" && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "OpenAI-Beta": "assistants=v2",
        },
      });
      
      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      attempts++;
    }

    if (runStatus !== "completed") {
      console.error("Run did not complete:", runStatus);
      await deleteOpenAIFile(fileId, apiKey);
      await deleteOpenAIAssistant(assistantId, apiKey);
      return fallbackPdfExtraction(bytes);
    }

    // Get messages
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "OpenAI-Beta": "assistants=v2",
      },
    });

    const messagesData = await messagesResponse.json();
    const assistantMessage = messagesData.data?.find((m: any) => m.role === "assistant");
    const extractedText = assistantMessage?.content?.[0]?.text?.value || "";

    // Clean up
    await deleteOpenAIFile(fileId, apiKey);
    await deleteOpenAIAssistant(assistantId, apiKey);

    console.log(`Assistant extracted ${extractedText.length} characters`);
    return extractedText;
  } catch (error) {
    console.error("Assistant extraction error:", error);
    return fallbackPdfExtraction(bytes);
  }
}

async function deleteOpenAIFile(fileId: string, apiKey: string) {
  try {
    await fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
  } catch (e) {
    console.error("Error deleting file:", e);
  }
}

async function deleteOpenAIAssistant(assistantId: string, apiKey: string) {
  try {
    await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
      method: "DELETE",
      headers: { 
        "Authorization": `Bearer ${apiKey}`,
        "OpenAI-Beta": "assistants=v2",
      },
    });
  } catch (e) {
    console.error("Error deleting assistant:", e);
  }
}

function fallbackPdfExtraction(bytes: Uint8Array): string {
  const textDecoder = new TextDecoder("utf-8", { fatal: false });
  const rawText = textDecoder.decode(bytes);
  
  const parts: string[] = [];
  
  // Extract URLs and emails
  const urls = rawText.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g) || [];
  const emails = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  
  if (emails.length > 0) {
    parts.push(`Email: ${emails[0]}`);
  }
  
  urls.forEach(url => {
    if (url.includes("linkedin.com")) {
      parts.push(`LinkedIn: ${url}`);
    } else if (!url.includes("adobe") && !url.includes("w3.org")) {
      parts.push(`Website: ${url}`);
    }
  });
  
  // Try to extract readable text from parentheses
  const parenMatches = rawText.match(/\(([^)]{3,200})\)/g);
  if (parenMatches) {
    parenMatches.forEach(match => {
      const content = match.slice(1, -1);
      if (/[a-zA-ZáéíóúâêîôûãõàèìòùçÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÇ]{4,}/.test(content)) {
        const readableChars = content.replace(/[^a-zA-Z0-9\s]/g, "").length;
        if (readableChars > content.length * 0.5) {
          parts.push(content);
        }
      }
    });
  }
  
  const text = parts.join("\n").slice(0, 5000);
  console.log(`Fallback extraction: ${text.length} characters`);
  return text;
}

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  try {
    const JSZip = await import("https://esm.sh/jszip@3.10.1?target=deno");
    
    const zip = await JSZip.default.loadAsync(bytes);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    
    if (!documentXml) {
      return "";
    }
    
    const textMatches = documentXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (textMatches) {
      const text = textMatches
        .map((m) => {
          return m
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
        })
        .join(" ");
      console.log(`DOCX extracted ${text.length} characters`);
      return text;
    }
    
    return "";
  } catch (error) {
    console.error("DOCX extraction error:", error);
    return "";
  }
}
