import { useState } from "react";
import { FileText, TrendingUp, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResumeInput } from "@/components/ResumeInput";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromFile, AnalysisResult } from "@/lib/analysis";
import { supabase } from "@/integrations/supabase/client";
import { saveToCloudHistory } from "@/lib/history";
import { useAuth } from "@/hooks/useAuth";
import { AnalysisLoading } from "@/components/AnalysisLoading";

interface MemberAnalysisFormProps {
  hasActiveSubscription: boolean;
  hasReachedLimit: boolean;
  onAnalysisComplete: (result: AnalysisResult, isPremium: boolean) => void;
  onUsageIncremented: () => void;
}

export const MemberAnalysisForm = ({
  hasActiveSubscription,
  hasReachedLimit,
  onAnalysisComplete,
  onUsageIncremented,
}: MemberAnalysisFormProps) => {
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleAnalyze = async (generatePremium: boolean) => {
    if (!jobDescription.trim() || jobDescription.trim().length < 50) {
      toast({
        title: "Descrição da vaga obrigatória",
        description: "Cole a descrição completa da vaga (mínimo 50 caracteres).",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile && !linkedInUrl.trim()) {
      toast({
        title: "Currículo obrigatório",
        description: "Envie um arquivo PDF/DOCX ou insira a URL do LinkedIn.",
        variant: "destructive",
      });
      return;
    }

    if (generatePremium && hasReachedLimit) {
      toast({
        title: "Limite atingido",
        description: "Você atingiu o limite de análises deste período.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let resumeText = "";
      if (selectedFile) {
        resumeText = await extractTextFromFile(selectedFile);
      }

      if (generatePremium && hasActiveSubscription) {
        // Increment usage first
        const { data: usageData, error: usageError } = await supabase.functions.invoke("increment-usage");
        
        if (usageError || !usageData?.success) {
          throw new Error(usageData?.error || "Erro ao verificar limite de uso");
        }

        // Generate premium analysis
        const { data, error } = await supabase.functions.invoke("analyze-resume", {
          body: {
            resumeText: resumeText || undefined,
            linkedInUrl: linkedInUrl.trim() || undefined,
            jobDescription: jobDescription.trim(),
            type: "premium",
          },
        });

        if (error) throw error;

        console.log("Premium analysis result:", data);

        // Save to history
        if (user && data) {
          try {
            await saveToCloudHistory(user.id, {
              jobTitle: data.jobTitle || "Análise de Vaga",
              company: data.company,
              score: data.score,
              summary: data.summary,
              strengths: data.strengths,
              weaknesses: data.weaknesses,
              improvements: data.improvements,
              missingKeywords: data.missingKeywords,
              isPremium: true,
            });
            console.log("History saved successfully");
          } catch (historyError) {
            console.error("Error saving history:", historyError);
          }
        }

        onUsageIncremented();
        onAnalysisComplete(data, true);
      } else {
        // Free analysis
        const { data, error } = await supabase.functions.invoke("analyze-resume", {
          body: {
            resumeText: resumeText || undefined,
            linkedInUrl: linkedInUrl.trim() || undefined,
            jobDescription: jobDescription.trim(),
            type: "free",
          },
        });

        if (error) throw error;

        console.log("Free analysis result:", data);

        // Save to history
        if (user && data) {
          try {
            await saveToCloudHistory(user.id, {
              jobTitle: data.jobTitle || "Análise de Vaga",
              company: data.company,
              score: data.score,
              summary: data.summary,
              isPremium: false,
            });
            console.log("Free history saved successfully");
          } catch (historyError) {
            console.error("Error saving free history:", historyError);
          }
        }

        onAnalysisComplete(data, false);
      }

      // Clear form after successful analysis
      setJobDescription("");
      setLinkedInUrl("");
      setSelectedFile(null);
    } catch (error) {
      toast({
        title: "Erro na análise",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && <AnalysisLoading />}
      <div className="p-6 rounded-2xl bg-card border border-border">
        <div className="space-y-6">
          {/* Resume Input */}
          <div>
            <Label className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">1</span>
              Seu Currículo
            </Label>
            <ResumeInput
              selectedFile={selectedFile}
              onFileChange={setSelectedFile}
              linkedInUrl={linkedInUrl}
              onLinkedInChange={setLinkedInUrl}
              isLoading={isLoading}
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Job Description */}
          <div className="space-y-3">
            <Label htmlFor="jobDescription" className="text-base font-semibold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">2</span>
              Descrição da Vaga
            </Label>
            <div className="relative group">
              <div className="absolute left-4 top-4 w-5 h-5 rounded bg-accent/20 flex items-center justify-center">
                <FileText className="w-3 h-3 text-accent" />
              </div>
              <Textarea
                id="jobDescription"
                placeholder="Cole aqui a descrição completa da vaga (requisitos, responsabilidades, qualificações...)"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="pl-12 min-h-[120px] bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 transition-all resize-none"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Copie e cole a descrição completa da vaga para uma análise mais precisa
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {hasActiveSubscription && !hasReachedLimit && (
              <Button
                variant="hero"
                className="flex-1 group"
                onClick={() => handleAnalyze(true)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    Gerar Análise Detalhada
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            )}
            
            <Button
              variant={hasActiveSubscription && !hasReachedLimit ? "outline" : "hero"}
              className="flex-1"
              onClick={() => handleAnalyze(false)}
              disabled={isLoading}
            >
              {isLoading && !hasActiveSubscription ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Gerar Análise Gratuita"
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
