import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Zap, Shield, Cpu, Mail } from "lucide-react";
import { AnalysisLoading } from "@/components/AnalysisLoading";
import { Button } from "@/components/ui/button";
import { AnalysisModal } from "@/components/AnalysisModal";
import { UserMenu } from "@/components/UserMenu";
import { PricingSection } from "@/components/PricingSection";
import { MentorshipSection } from "@/components/MentorshipSection";
import { ResumeFlow } from "@/components/ResumeFlow";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AnalysisResult } from "@/lib/analysis";
import { supabase } from "@/integrations/supabase/client";
import cvxLogo from "@/assets/cvx-logo.png";

interface SubscriptionInfo {
  subscribed: boolean;
  product_id: string | null;
  product_name: string | null;
  analyses_used: number;
  analyses_limit: number;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPremiumResult, setIsPremiumResult] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const { toast } = useToast();
  const { session } = useAuth();
  const navigate = useNavigate();

  // Check subscription status when user is logged in
  useEffect(() => {
    const checkSubscription = async () => {
      if (!session) {
        setSubscription(null);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("check-subscription");
        if (error) throw error;
        setSubscription(data);
        
        if (data?.subscribed === true) {
          navigate("/members");
          return;
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        setSubscription(null);
      }
    };

    checkSubscription();
  }, [session, navigate]);

  const handleFlowAnalyze = async (jobDescription: string, resumeText: string) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: {
          resumeText,
          jobDescription,
          type: "free",
        },
      });

      if (error) throw error;

      setAnalysisResult(data);
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

  const features = [
    { icon: Cpu, title: "IA Avançada", description: "Tecnologia de ponta" },
    { icon: Zap, title: "Instantâneo", description: "Resultado em segundos" },
    { icon: Shield, title: "Seguro", description: "Dados criptografados" },
  ];

  const stats = [
    { value: "98%", label: "Precisão" },
    { value: "50K+", label: "Análises" },
    { value: "4.9", label: "Avaliação" },
  ];

  return (
    <div className="min-h-screen gradient-hero neural-pattern">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px] animate-glow-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/6 rounded-full blur-[120px] animate-glow-pulse delay-300" />
      </div>

      <header className="relative container py-5">
        <div className="flex items-center justify-between">
          <img src={cvxLogo} alt="CVX" className="h-14 w-auto" />
          <UserMenu />
        </div>
      </header>

      <main className="relative container pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center pt-8 pb-16">
          <div className="text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-up">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Powered by AI</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display text-foreground mb-6 leading-[1.1] animate-fade-up delay-100">
              Análise Inteligente de{" "}
              <span className="text-foreground">Currículo com IA</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10 animate-fade-up delay-200">
              Avalie seu currículo com tecnologia usada por recrutadores de alto nível.
            </p>

            <div className="flex items-center gap-8 md:gap-12 animate-fade-up delay-300">
              {stats.map((stat, i) => (
                <div key={i} className="text-left">
                  <div className="text-2xl md:text-3xl font-bold font-display text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-center animate-fade-up delay-300">
            <div className="relative w-72 h-72 md:w-80 md:h-80">
              <div className="absolute inset-0 rounded-full border border-primary/20 animate-orbit" style={{ animationDuration: '25s' }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-glow-sm" />
              </div>
              <div className="absolute inset-6 rounded-full border border-accent/20 animate-orbit" style={{ animationDuration: '18s', animationDirection: 'reverse' }}>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-accent shadow-glow-cyan" />
              </div>
              <div className="absolute inset-20 rounded-full bg-card border border-border flex items-center justify-center shadow-card-premium">
                <div className="text-center">
                  <div className="text-4xl font-bold font-display text-gradient">AI</div>
                  <div className="text-xs text-muted-foreground mt-1">Scanning</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12 animate-fade-up delay-300">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border backdrop-blur-sm hover-lift group">
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

        <div className="max-w-2xl mx-auto animate-fade-up delay-400">
          <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-card-premium relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <div className="relative">
              <ResumeFlow onAnalyze={handleFlowAnalyze} isLoading={isLoading} />
            </div>
          </div>
        </div>

        <PricingSection />
        <MentorshipSection />

        <div className="text-center mt-16 animate-fade-up">
          <p className="text-muted-foreground mb-4">Dúvidas ou sugestões?</p>
          <Button variant="outline" asChild className="gap-2">
            <a href="mailto:contato@cvxapp.com">
              <Mail className="w-4 h-4" />
              Fale Conosco
            </a>
          </Button>
        </div>
      </main>

      {isLoading && <AnalysisLoading />}

      <AnalysisModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        result={analysisResult}
        isPremium={isPremiumResult}
      />
    </div>
  );
};

export default Index;
