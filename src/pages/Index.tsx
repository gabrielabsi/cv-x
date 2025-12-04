import { useState } from "react";
import { 
  Link, 
  Loader2, 
  Sparkles, 
  Zap, 
  Shield, 
  Cpu,
  TrendingUp,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResumeInput } from "@/components/ResumeInput";
import { AnalysisModal } from "@/components/AnalysisModal";
import { HistorySection, HistoryItem } from "@/components/HistorySection";
import { UserMenu } from "@/components/UserMenu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { analyzeFree, analyzePremium, extractTextFromFile, AnalysisResult } from "@/lib/analysis";
import { saveToLocalHistory, saveToCloudHistory } from "@/lib/history";
import cvxLogo from "@/assets/cvx-logo.png";

const Index = () => {
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPremiumResult, setIsPremiumResult] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  const saveHistory = async (item: Omit<HistoryItem, "id" | "date">) => {
    if (user) {
      await saveToCloudHistory(user.id, item);
    } else {
      saveToLocalHistory(item);
    }
    setHistoryRefresh((prev) => prev + 1);
  };

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

      const jobTitle = extractJobTitle(jobUrl);
      await saveHistory({
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

      const jobTitle = extractJobTitle(jobUrl);
      await saveHistory({
        score: result.score,
        jobTitle,
        summary: result.summary,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        improvements: result.improvements,
        missingKeywords: result.missingKeywords,
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
      strengths: item.strengths,
      weaknesses: item.weaknesses,
      improvements: item.improvements,
      missingKeywords: item.missingKeywords,
    });
    setIsPremiumResult(item.isPremium);
    setIsModalOpen(true);
  };

  const extractJobTitle = (url: string): string => {
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
      icon: Cpu,
      title: "IA Avançada",
      description: "Tecnologia de ponta",
    },
    {
      icon: Zap,
      title: "Instantâneo",
      description: "Resultado em segundos",
    },
    {
      icon: Shield,
      title: "Seguro",
      description: "Dados criptografados",
    },
  ];

  const stats = [
    { value: "98%", label: "Precisão" },
    { value: "50K+", label: "Análises" },
    { value: "4.9", label: "Avaliação" },
  ];

  return (
    <div className="min-h-screen gradient-hero neural-pattern">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px] animate-glow-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/6 rounded-full blur-[120px] animate-glow-pulse delay-300" />
      </div>

      {/* Header */}
      <header className="relative container py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={cvxLogo} 
              alt="CVX" 
              className="h-10 w-auto"
            />
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Hero */}
      <main className="relative container pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center pt-8 pb-16">
          {/* Left: Text Content */}
          <div className="text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-up">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Powered by AI</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display text-foreground mb-6 leading-[1.1] animate-fade-up delay-100">
              Análise Inteligente de{" "}
              <span className="text-gradient">Currículo com IA</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10 animate-fade-up delay-200">
              Avalie seu currículo com tecnologia usada por recrutadores de alto nível.
              Obtenha insights precisos e melhore suas chances de contratação.
            </p>

            {/* Stats */}
            <div className="flex items-center gap-8 md:gap-12 animate-fade-up delay-300">
              {stats.map((stat, i) => (
                <div key={i} className="text-left">
                  <div className="text-2xl md:text-3xl font-bold font-display text-foreground">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: AI Visual Element */}
          <div className="relative flex items-center justify-center animate-fade-up delay-300">
            <div className="relative w-72 h-72 md:w-80 md:h-80">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border border-primary/20 animate-orbit" style={{ animationDuration: '25s' }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-glow-sm" />
              </div>
              
              {/* Middle ring */}
              <div className="absolute inset-6 rounded-full border border-accent/20 animate-orbit" style={{ animationDuration: '18s', animationDirection: 'reverse' }}>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-accent shadow-glow-cyan" />
              </div>
              
              {/* Inner ring */}
              <div className="absolute inset-12 rounded-full border border-primary/30 animate-orbit" style={{ animationDuration: '12s' }}>
                <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/80" />
              </div>
              
              {/* Center glow */}
              <div className="absolute inset-16 rounded-full gradient-primary opacity-20 animate-pulse-ring" />
              
              {/* Center core */}
              <div className="absolute inset-20 rounded-full bg-card border border-border flex items-center justify-center shadow-card-premium">
                <div className="text-center">
                  <div className="text-4xl font-bold font-display text-gradient">AI</div>
                  <div className="text-xs text-muted-foreground mt-1">Scanning</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12 animate-fade-up delay-300">
          {features.map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border backdrop-blur-sm hover-lift group"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="max-w-2xl mx-auto animate-fade-up delay-400">
          <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-card-premium relative overflow-hidden">
            {/* Card glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            
            <div className="relative space-y-6">
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

              {/* Job URL */}
              <div className="space-y-3">
                <Label htmlFor="jobUrl" className="text-base font-semibold text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">2</span>
                  URL da Vaga
                </Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded bg-accent/20 flex items-center justify-center">
                    <Link className="w-3 h-3 text-accent" />
                  </div>
                  <Input
                    id="jobUrl"
                    type="url"
                    placeholder="https://linkedin.com/jobs/view/..."
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    className="pl-12 h-12 bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 transition-all"
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
                className="w-full group"
                onClick={handleAnalyze}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analisando com IA...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    Gerar Análise Gratuita
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Análise gratuita • Sem cadastro necessário • Resultado em segundos
              </p>
            </div>
          </div>
        </div>

        {/* History */}
        <HistorySection onViewResult={handleViewHistory} refreshTrigger={historyRefresh} />
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