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
      
      if (fileName.endsWith(".pdf")) {
        // Simple PDF text extraction
        // Convert to string and extract visible text
        const textDecoder = new TextDecoder("utf-8", { fatal: false });
        const rawText = textDecoder.decode(bytes);
        
        // Extract text between stream objects (simplified)
        const textMatches = rawText.match(/\(([^)]+)\)/g);
        if (textMatches) {
          text = textMatches
            .map((m) => m.slice(1, -1))
            .filter((t) => t.length > 2 && /[a-zA-Z]/.test(t))
            .join(" ")
            .slice(0, 5000);
        }
        
        // If extraction failed, try another method
        if (text.length < 100) {
          // Look for text in BT...ET blocks
          const btMatches = rawText.match(/BT[\s\S]*?ET/g);
          if (btMatches) {
            text = btMatches
              .join(" ")
              .replace(/[^\w\s@.,-]/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 5000);
          }
        }
      } else if (fileName.endsWith(".docx")) {
        // DOCX is a ZIP file, extract document.xml
        // Simplified extraction - look for text content
        const textDecoder = new TextDecoder("utf-8", { fatal: false });
        const rawText = textDecoder.decode(bytes);
        
        // Extract text from XML tags
        const textMatches = rawText.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
        if (textMatches) {
          text = textMatches
            .map((m) => m.replace(/<[^>]+>/g, ""))
            .join(" ")
            .slice(0, 5000);
        }
      }

      // Clean up text
      text = text
        .replace(/\s+/g, " ")
        .replace(/[^\w\s@.,-áéíóúâêîôûãõàèìòùçÁÉÍÓÚÂÊÎÔÛÃÕÀÈÌÒÙÇ]/gi, " ")
        .trim();

      if (text.length < 50) {
        // Return a message that the file couldn't be fully parsed
        text = "Arquivo processado. Conteúdo extraído parcialmente. Para melhores resultados, cole o texto do currículo diretamente ou use LinkedIn.";
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

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Extract error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao extrair texto";
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        text: "Não foi possível extrair o texto do arquivo." 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
