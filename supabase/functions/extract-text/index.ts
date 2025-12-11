import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import pako from "https://esm.sh/pako@2.1.0";

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
  const textDecoder = new TextDecoder("utf-8", { fatal: false });
  const rawText = textDecoder.decode(bytes);
  
  const extractedParts: string[] = [];
  
  // Method 1: Extract and decompress FlateDecode streams (common in modern PDFs)
  try {
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let match;
    
    while ((match = streamRegex.exec(rawText)) !== null) {
      const streamContent = match[1];
      
      // Try to find the raw bytes of this stream in the original data
      const streamStart = match.index + match[0].indexOf(streamContent);
      const streamBytes = bytes.slice(streamStart, streamStart + streamContent.length);
      
      // Try to decompress with pako (zlib/deflate)
      try {
        const decompressed = pako.inflate(streamBytes);
        const decompressedText = new TextDecoder("utf-8", { fatal: false }).decode(decompressed);
        
        // Extract text from the decompressed content
        const textFromStream = extractTextFromPdfContent(decompressedText);
        if (textFromStream.length > 10) {
          extractedParts.push(textFromStream);
        }
      } catch (e) {
        // Stream might not be compressed or use different compression
        const textFromStream = extractTextFromPdfContent(streamContent);
        if (textFromStream.length > 10) {
          extractedParts.push(textFromStream);
        }
      }
    }
  } catch (e) {
    console.log("Stream extraction failed:", e);
  }
  
  // Method 2: Direct text extraction from parentheses (uncompressed PDFs)
  const parenText = extractTextFromParentheses(rawText);
  if (parenText.length > 50) {
    extractedParts.push(parenText);
  }
  
  // Method 3: Look for BT/ET text blocks
  const btText = extractTextFromBTBlocks(rawText);
  if (btText.length > 50) {
    extractedParts.push(btText);
  }
  
  // Method 4: Extract URLs and emails (always useful from LinkedIn PDFs)
  const urls = rawText.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g) || [];
  const emails = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  
  // Combine all extracted text
  let combinedText = extractedParts.join("\n\n");
  
  // If we have URLs/emails but little text, add them
  if (combinedText.length < 200) {
    if (emails.length > 0) {
      combinedText = `Email: ${emails[0]}\n` + combinedText;
    }
    urls.forEach(url => {
      if (url.includes("linkedin.com")) {
        combinedText = `LinkedIn: ${url}\n` + combinedText;
      }
    });
  }
  
  // Clean the result
  combinedText = combinedText
    .replace(/[^\w\s@.,-áéíóúâêîôûãõàèìòùçÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÇ:;()\/&+'"!?#$%@\n]/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
  
  console.log(`PDF extraction: ${combinedText.length} characters`);
  
  // If still too short, the PDF likely needs OCR or has only images
  if (combinedText.length < 100) {
    return "Este PDF parece conter apenas imagens ou texto não extraível. Por favor, cole o texto do seu currículo diretamente ou exporte seu perfil do LinkedIn como texto.";
  }
  
  return combinedText.slice(0, 30000);
}

function extractTextFromPdfContent(content: string): string {
  const parts: string[] = [];
  
  // Extract text from Tj operators
  const tjMatches = content.match(/\(([^)]*)\)\s*Tj/g);
  if (tjMatches) {
    tjMatches.forEach(match => {
      const text = match.replace(/\)\s*Tj$/, "").replace(/^\(/, "");
      if (text.length > 1 && /[a-zA-ZáéíóúÁÉÍÓÚ]/.test(text)) {
        parts.push(decodePdfString(text));
      }
    });
  }
  
  // Extract text from TJ arrays
  const tjArrayMatches = content.match(/\[((?:[^[\]]*|\[(?:[^[\]]*|\[[^\]]*\])*\])*)\]\s*TJ/gi);
  if (tjArrayMatches) {
    tjArrayMatches.forEach(match => {
      const stringMatches = match.match(/\(([^)]*)\)/g);
      if (stringMatches) {
        stringMatches.forEach(str => {
          const text = str.slice(1, -1);
          if (text.length > 0 && /[a-zA-ZáéíóúÁÉÍÓÚ]/.test(text)) {
            parts.push(decodePdfString(text));
          }
        });
      }
    });
  }
  
  return parts.join(" ");
}

function decodePdfString(str: string): string {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function extractTextFromParentheses(rawText: string): string {
  const parts: string[] = [];
  const matches = rawText.match(/\(([^)]{3,500})\)/g);
  
  if (matches) {
    matches.forEach(match => {
      const content = match.slice(1, -1);
      // Filter readable text only
      if (/[a-zA-ZáéíóúâêîôûãõàèìòùçÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÇ]{3,}/.test(content) &&
          !/^[\x00-\x1f\x80-\xff]+$/.test(content)) {
        const decoded = decodePdfString(content);
        // Only keep if mostly readable characters
        const readableChars = decoded.replace(/[^a-zA-Z0-9\s]/g, "").length;
        if (readableChars > decoded.length * 0.3) {
          parts.push(decoded);
        }
      }
    });
  }
  
  return parts.join(" ");
}

function extractTextFromBTBlocks(rawText: string): string {
  const parts: string[] = [];
  const btMatches = rawText.match(/BT[\s\S]{10,5000}?ET/g);
  
  if (btMatches) {
    btMatches.forEach(block => {
      const text = extractTextFromPdfContent(block);
      if (text.length > 5) {
        parts.push(text);
      }
    });
  }
  
  return parts.join(" ");
}

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  try {
    const JSZip = await import("https://esm.sh/jszip@3.10.1?target=deno");
    
    const zip = await JSZip.default.loadAsync(bytes);
    const documentXml = await zip.file("word/document.xml")?.async("string");
    
    if (!documentXml) {
      console.log("document.xml not found in DOCX, trying fallback");
      return fallbackDocxExtraction(bytes);
    }
    
    // Extract text from XML
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
