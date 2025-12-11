import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

// Helper function to convert Uint8Array to base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  return base64Encode(bytes.buffer as ArrayBuffer);
}

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
        // Use OpenAI to extract text from PDF
        text = await extractPdfTextWithOpenAI(bytes, fileName);
      } else if (fileName.endsWith(".docx")) {
        text = await extractDocxText(bytes);
      }

      text = cleanText(text);
      
      if (text.length > 50000) {
        text = text.slice(0, 50000);
      }

      console.log(`Extracted ${text.length} characters from file`);

      if (text.length < 50) {
        text = "Não foi possível extrair texto suficiente do arquivo. Por favor, cole o texto do currículo diretamente.";
      }
    } else {
      const rawBody = await req.json();
      const validationResult = jsonInputSchema.safeParse(rawBody);
      
      if (!validationResult.success) {
        return new Response(
          JSON.stringify({ error: "Invalid input", details: validationResult.error.errors.map(e => e.message) }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        text: "Não foi possível extrair o texto do arquivo. Por favor, cole o texto do currículo diretamente." 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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

async function extractPdfTextWithOpenAI(bytes: Uint8Array, fileName: string): Promise<string> {
  const openAIApiKey = Deno.env.get("Open_AI");
  
  if (!openAIApiKey) {
    console.error("OpenAI API key not found");
    return fallbackPdfExtraction(bytes);
  }

  try {
    // Convert PDF to base64
    const base64Pdf = uint8ArrayToBase64(bytes);
    
    console.log("Sending PDF to OpenAI for text extraction...");
    
    // Use GPT-4o to extract text from the PDF
    // We'll send it as a data URL and ask the model to extract all text
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em extração de texto de documentos. 
Sua tarefa é extrair TODO o texto visível do documento PDF fornecido.
Retorne APENAS o texto extraído, sem formatação adicional, comentários ou explicações.
Mantenha a estrutura do documento (parágrafos, listas, seções).
Se o documento for um currículo, extraia todas as informações: nome, contato, experiência, educação, habilidades, etc.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extraia todo o texto deste documento PDF (arquivo: ${fileName}). Retorne apenas o texto extraído.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      // If the model doesn't support PDF directly, try alternative approach
      if (response.status === 400) {
        console.log("Trying alternative extraction with file upload...");
        return await extractPdfWithAssistant(bytes, openAIApiKey);
      }
      
      return fallbackPdfExtraction(bytes);
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";
    
    console.log(`OpenAI extracted ${extractedText.length} characters`);
    
    if (extractedText.length < 50) {
      console.log("OpenAI extraction returned too little text, trying fallback");
      return fallbackPdfExtraction(bytes);
    }
    
    return extractedText;
  } catch (error) {
    console.error("OpenAI extraction error:", error);
    return fallbackPdfExtraction(bytes);
  }
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
