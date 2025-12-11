import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation schema for JSON input
const jsonInputSchema = z.object({
  text: z.string().max(100000, "Text too long").optional().default(""),
});

// Constants for file validation
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

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return new Response(
          JSON.stringify({ error: "File too large. Maximum size is 10MB" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fileName = file.name.toLowerCase();
      
      // Validate file extension
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
        text = await extractPdfText(bytes);
      } else if (fileName.endsWith(".docx")) {
        text = await extractDocxText(bytes);
      }

      // Clean up and limit text
      text = cleanText(text);
      
      if (text.length > 50000) {
        text = text.slice(0, 50000);
      }

      console.log(`Extracted ${text.length} characters from file`);

      if (text.length < 50) {
        console.log("Extracted text too short, returning fallback message");
        text = "Não foi possível extrair texto suficiente do arquivo. Por favor, cole o texto do currículo diretamente.";
      }
    } else {
      // Validate JSON input
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

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // Use improved text extraction for PDFs
  return fallbackPdfExtraction(bytes);
}

function fallbackPdfExtraction(bytes: Uint8Array): string {
  const textDecoder = new TextDecoder("utf-8", { fatal: false });
  const rawText = textDecoder.decode(bytes);
  
  let text = "";
  const extractedParts: string[] = [];
  
  // Method 1: Extract text from Tj and TJ operators (most common PDF text commands)
  const tjMatches = rawText.match(/\(([^)]{2,})\)\s*Tj/g);
  if (tjMatches) {
    for (const match of tjMatches) {
      const content = match.replace(/\)\s*Tj$/, "").replace(/^\(/, "");
      if (content.length > 1 && /[a-zA-ZáéíóúÁÉÍÓÚ]/.test(content)) {
        extractedParts.push(content);
      }
    }
  }
  
  // Method 2: Extract text from parentheses (PDF string literals)
  const parenMatches = rawText.match(/\(([^)]+)\)/g);
  if (parenMatches) {
    for (const match of parenMatches) {
      const content = match.slice(1, -1);
      // Filter out binary/encoded content and keep readable text
      if (content.length > 2 && 
          content.length < 500 && 
          /[a-zA-ZáéíóúâêîôûãõàèìòùçÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÇ]{2,}/.test(content) &&
          !/^[\x00-\x1f]+$/.test(content)) {
        // Decode common PDF escape sequences
        const decoded = content
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "")
          .replace(/\\t/g, " ")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\");
        extractedParts.push(decoded);
      }
    }
  }
  
  // Method 3: Look for text in BT...ET blocks (text objects)
  const btMatches = rawText.match(/BT[\s\S]{10,5000}?ET/g);
  if (btMatches) {
    for (const block of btMatches) {
      // Extract strings from within the block
      const blockStrings = block.match(/\(([^)]+)\)/g);
      if (blockStrings) {
        for (const str of blockStrings) {
          const content = str.slice(1, -1);
          if (content.length > 1 && /[a-zA-Z]/.test(content)) {
            extractedParts.push(content);
          }
        }
      }
    }
  }
  
  // Combine and deduplicate
  const seen = new Set<string>();
  const uniqueParts: string[] = [];
  for (const part of extractedParts) {
    const normalized = part.trim();
    if (normalized.length > 0 && !seen.has(normalized)) {
      seen.add(normalized);
      uniqueParts.push(normalized);
    }
  }
  
  text = uniqueParts.join(" ");
  
  // Clean up any remaining PDF artifacts
  text = text
    .replace(/\\[0-9]{3}/g, "") // Remove octal escapes
    .replace(/[^\w\s@.,-áéíóúâêîôûãõàèìòùçÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÇ:;()\/&+'"!?#$%\n]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  console.log(`Fallback PDF extraction: ${text.length} characters`);
  return text.slice(0, 30000);
}

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  try {
    // Dynamic import of JSZip via esm.sh
    const JSZip = await import("https://esm.sh/jszip@3.10.1?target=deno");
    
    const zip = await JSZip.default.loadAsync(bytes);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    
    if (!documentXml) {
      console.log("document.xml not found in DOCX, trying fallback");
      return fallbackDocxExtraction(bytes);
    }
    
    // Extract text from XML - handle both <w:t> and <w:t xml:space="preserve">
    const textMatches = documentXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (textMatches) {
      const text = textMatches
        .map((m) => {
          // Remove XML tags and decode entities
          return m
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
        })
        .join(" ");
      console.log(`DOCX parsed with JSZip, extracted ${text.length} characters`);
      return text;
    }
    
    return fallbackDocxExtraction(bytes);
  } catch (error) {
    console.error("DOCX extraction error:", error);
    return fallbackDocxExtraction(bytes);
  }
}

function fallbackDocxExtraction(bytes: Uint8Array): string {
  const textDecoder = new TextDecoder("utf-8", { fatal: false });
  const rawText = textDecoder.decode(bytes);
  
  // Extract text from XML tags
  const textMatches = rawText.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
  if (textMatches) {
    const text = textMatches
      .map((m) => m.replace(/<[^>]+>/g, ""))
      .join(" ");
    console.log(`Fallback DOCX extraction: ${text.length} characters`);
    return text;
  }
  
  return "";
}
