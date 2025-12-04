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
    const contentType = req.headers.get("content-type") || "";
    
    let text = "";
    
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      
      if (!file) {
        throw new Error("No file provided");
      }

      const fileName = file.name.toLowerCase();
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
      const body = await req.json();
      text = body.text || "";
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
