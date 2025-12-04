import { supabase } from "@/integrations/supabase/client";

export interface AnalysisInput {
  resumeText?: string;
  linkedInUrl?: string;
  jobUrl: string;
}

export interface AnalysisResult {
  score: number;
  summary: string;
  strengths?: string[];
  weaknesses?: string[];
  improvements?: string[];
  keywords?: string[];
}

export async function analyzeFree(input: AnalysisInput): Promise<AnalysisResult> {
  const { data, error } = await supabase.functions.invoke("analyze-resume", {
    body: { ...input, type: "free" },
  });

  if (error) {
    console.error("Analysis error:", error);
    throw new Error("Erro ao analisar currículo. Tente novamente.");
  }

  return data;
}

export async function analyzePremium(input: AnalysisInput): Promise<AnalysisResult> {
  const { data, error } = await supabase.functions.invoke("analyze-resume", {
    body: { ...input, type: "premium" },
  });

  if (error) {
    console.error("Analysis error:", error);
    throw new Error("Erro ao gerar relatório. Tente novamente.");
  }

  return data;
}

export async function extractTextFromFile(file: File): Promise<string> {
  // For PDF files, we'll send them to the edge function for extraction
  const formData = new FormData();
  formData.append("file", file);
  
  const { data, error } = await supabase.functions.invoke("extract-text", {
    body: formData,
  });

  if (error) {
    console.error("Extraction error:", error);
    throw new Error("Erro ao extrair texto do arquivo.");
  }

  return data.text;
}
