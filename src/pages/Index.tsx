import { useState } from "react";
import { FileSearch, Link, Loader2, Sparkles, Zap, Shield, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResumeInput } from "@/components/ResumeInput";
import { AnalysisModal } from "@/components/AnalysisModal";
import { HistorySection, HistoryItem, saveToHistory } from "@/components/HistorySection";
import { useToast } from "@/hooks/use-toast";
import { analyzeFree, analyzePremium, extractTextFromFile, AnalysisResult } from "@/lib/analysis";

const Index = () => {
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPremiumResult, setIsPremiumResult] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!jobUrl.trim()) {
      toast({
        title: "URL da vaga obrigatória",
        description: "Por favor, insira a URL da vaga para análise.",
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

    setIsLoading(true);

    try {
      let resumeText = "";
      
      if (selectedFile) {
        resumeText = await extractTextFromFile(selectedFile);
      }

      const result = await analyzeFree({
        resumeText: resumeText || undefined,
        linkedInUrl: linkedInUrl.trim() || undefined,
        jobUrl: jobUrl.trim(),
      });

      setAnalysisResult(result);
      setIsPremiumResult(false);
      setIsModalOpen(true);

      // Save to history
      const jobTitle = extractJobTitle(jobUrl);
      saveToHistory({
        score: result.score,
        jobTitle,
        summary: result.summary,
        isPremium: false,
      });
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

  const handleUpgrade = async () => {
    // For now, simulate premium result
    // In production, this would trigger Stripe payment
    setIsLoading(true);
    
    try {
      let resumeText = "";
      
      if (selectedFile) {
        resumeText = await extractTextFromFile(selectedFile);
      }

      const result = await analyzePremium({
        resumeText: resumeText || undefined,
        linkedInUrl: linkedInUrl.trim() || undefined,
        jobUrl: jobUrl.trim(),
      });

      setAnalysisResult(result);
      setIsPremiumResult(true);

      // Update history
      const jobTitle = extractJobTitle(jobUrl);
      saveToHistory({
        score: result.score,
        jobTitle,
        summary: result.summary,
        isPremium: true,
      });

      toast({
        title: "Relatório gerado!",
        description: "Seu relatório completo está pronto.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewHistory = (item: HistoryItem) => {
    setAnalysisResult({
      score: item.score,
      summary: item.summary,
    });
    setIsPremiumResult(item.isPremium);
    setIsModalOpen(true);
  };

  const extractJobTitle = (url: string): string => {
    // Simple extraction from LinkedIn job URL
    try {
      const parts = url.split("/");
      const jobIndex = parts.indexOf("jobs");
      if (jobIndex !== -1 && parts[jobIndex + 1]) {
        return decodeURIComponent(parts[jobIndex + 1]).replace(/-/g, " ");
      }
    } catch {}
    return "Vaga analisada";
  };

  const features = [
    {
      icon: Zap,
      title: "Análise Instantânea",
      description: "Resultado em segundos com IA avançada",
    },
    {
      icon: Target,
      title: "Match Preciso",
      description: "Compare seu perfil com os requisitos da vaga",
    },
    {
      icon: Shield,
      title: "Dados Seguros",
      description: "Seus dados são processados e não armazenados",
    },
  ];

  return (
    <div className="min-h-screen gradient-hero">
      {/* Header */}
      <header className="container py-6">
        <div className="flex items-center gap-2">
          <FileSearch className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold text-foreground">ResumeMatch</span>
        </div>
      </header>

      {/* Hero */}
      <main className="container pb-20">
        <div className="max-w-3xl mx-auto text-center pt-8 pb-12 animate-fade-up">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Avaliação de Currículo{" "}
            <span className="text-gradient">com IA</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Descubra em segundos como seu currículo se compara com a vaga dos seus sonhos.
            Análise gratuita com pontuação de match e sugestões de melhoria.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12 animate-fade-up delay-100">
          {features.map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border"
            >
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto animate-fade-up delay-200">
          <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-card">
            <div className="space-y-6">
              {/* Resume Input */}
              <div>
                <Label className="text-base font-semibold text-foreground mb-3 block">
                  1. Seu Currículo
                </Label>
                <ResumeInput
                  selectedFile={selectedFile}
                  onFileChange={setSelectedFile}
                  linkedInUrl={linkedInUrl}
                  onLinkedInChange={setLinkedInUrl}
                  isLoading={isLoading}
                />
              </div>

              {/* Job URL */}
              <div className="space-y-2">
                <Label htmlFor="jobUrl" className="text-base font-semibold text-foreground">
                  2. URL da Vaga
                </Label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="jobUrl"
                    type="url"
                    placeholder="https://linkedin.com/jobs/view/..."
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Cole a URL da vaga do LinkedIn ou outro site de empregos
                </p>
              </div>

              {/* Submit */}
              <Button
                variant="hero"
                className="w-full"
                onClick={handleAnalyze}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Gerar Análise Gratuita
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* History */}
        <HistorySection onViewResult={handleViewHistory} />
      </main>

      {/* Modal */}
      <AnalysisModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        result={analysisResult}
        onUpgrade={handleUpgrade}
        isPremium={isPremiumResult}
      />
    </div>
  );
};

export default Index;
