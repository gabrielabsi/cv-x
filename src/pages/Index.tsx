import { useState } from "react";
import { 
  Sparkles, 
  Zap, 
  Shield, 
  Cpu,
  TrendingUp,
  ChevronRight,
  FileText
} from "lucide-react";
import { AnalysisLoading } from "@/components/AnalysisLoading";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ResumeInput } from "@/components/ResumeInput";
import { AnalysisModal } from "@/components/AnalysisModal";
import { UserMenu } from "@/components/UserMenu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { analyzeFree, extractTextFromFile, AnalysisResult } from "@/lib/analysis";
import { supabase } from "@/integrations/supabase/client";
import cvxLogo from "@/assets/cvx-logo.png";
const Index = () => {
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPremiumResult, setIsPremiumResult] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleAnalyze = async () => {
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

    setIsLoading(true);

    try {
      let resumeText = "";
      
      if (selectedFile) {
        resumeText = await extractTextFromFile(selectedFile);
      }

      const result = await analyzeFree({
        resumeText: resumeText || undefined,
        linkedInUrl: linkedInUrl.trim() || undefined,
        jobDescription: jobDescription.trim(),
      });

      setAnalysisResult(result);
      setIsPremiumResult(false);
      setIsModalOpen(true);
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
      // Store analysis data for after payment
      let resumeText = "";
      if (selectedFile) {
        resumeText = await extractTextFromFile(selectedFile);
      }

      sessionStorage.setItem("cvx_pending_analysis", JSON.stringify({
        resumeText: resumeText || undefined,
        linkedInUrl: linkedInUrl.trim() || undefined,
        jobDescription: jobDescription.trim(),
      }));

      // Create checkout session
      const { data, error } = await supabase.functions.invoke("create-checkout");

      if (error) throw error;
      if (!data?.url) throw new Error("Falha ao criar sessão de pagamento");

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
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
              className="h-14 w-auto"
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
              <span className="text-foreground">Currículo com IA</span>
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

              {/* Submit */}
              <Button
                variant="hero"
                className="w-full group"
                onClick={handleAnalyze}
                disabled={isLoading}
              >
                <TrendingUp className="w-5 h-5" />
                Gerar Análise Gratuita
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Análise gratuita • Sem cadastro necessário • Resultado em segundos
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Loading Overlay */}
      {isLoading && <AnalysisLoading />}

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