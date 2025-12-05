import { supabase } from "@/integrations/supabase/client";

export interface AnalysisInput {
  resumeText?: string;
  linkedInUrl?: string;
  jobDescription: string;
}

export interface AnalysisResult {
  score: number;
  summary: string;
  strengths?: string[];
  weaknesses?: string[];
  improvements?: string[];
  missingKeywords?: string[];
}

export async function analyzeFree(input: AnalysisInput): Promise<AnalysisResult> {
  const { data, error } = await supabase.functions.invoke("analyze-resume", {
    body: input,
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

export interface VerifiedPremiumInput extends AnalysisInput {
  sessionId: string;
}

export async function analyzeVerifiedPremium(input: VerifiedPremiumInput): Promise<AnalysisResult> {
  const { data, error } = await supabase.functions.invoke("verify-payment", {
    body: {
      sessionId: input.sessionId,
      resumeText: input.resumeText,
      linkedInUrl: input.linkedInUrl,
      jobDescription: input.jobDescription,
    },
  });

  if (error) {
    console.error("Verified analysis error:", error);
    throw new Error("Erro ao verificar pagamento ou gerar relatório.");
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
