import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Zap, Shield, Target, Mail, Upload, Search, FileCheck, CheckCircle2, Users, ArrowRight, Briefcase, TrendingUp, Globe } from "lucide-react";
import { AnalysisLoading } from "@/components/AnalysisLoading";
import { Button } from "@/components/ui/button";
import { AnalysisModal } from "@/components/AnalysisModal";
import { UserMenu } from "@/components/UserMenu";
import { PricingSection } from "@/components/PricingSection";
import { MentorshipSection } from "@/components/MentorshipSection";
import { ResumeFlow } from "@/components/ResumeFlow";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { AnalysisResult } from "@/lib/analysis";
import { supabase } from "@/integrations/supabase/client";
import cvxLogo from "@/assets/cvx-logo.png";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
  const { t } = useLanguage();
  const navigate = useNavigate();

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
          type: "free"
        }
      });
      if (error) throw error;
      setAnalysisResult(data);
      setIsPremiumResult(false);
      setIsModalOpen(true);
    } catch (error) {
      toast({
        title: t("flow.analysisError"),
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const proofPoints = [
    { icon: Target, text: t("proof.ats") },
    { icon: Search, text: t("proof.keywords") },
    { icon: FileCheck, text: t("proof.rewrite") }
  ];

  const howItWorks = [
    { step: "1", title: t("how.step1.title"), description: t("how.step1.desc"), icon: Upload },
    { step: "2", title: t("how.step2.title"), description: t("how.step2.desc"), icon: Search },
    { step: "3", title: t("how.step3.title"), description: t("how.step3.desc"), icon: Sparkles }
  ];

  const proFeatures = [
    t("pro.feature1"),
    t("pro.feature2"),
    t("pro.feature3"),
    t("pro.feature4"),
    t("pro.feature5")
  ];

  const targetAudience = [
    { icon: Briefcase, text: t("target.item1") },
    { icon: TrendingUp, text: t("target.item2") },
    { icon: Target, text: t("target.item3") },
    { icon: Users, text: t("target.item4") }
  ];

  const faqItems = [
    { question: t("faq.q1"), answer: t("faq.a1") },
    { question: t("faq.q2"), answer: t("faq.a2") },
    { question: t("faq.q3"), answer: t("faq.a3") },
    { question: t("faq.q4"), answer: t("faq.a4") }
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
        {/* HERO SECTION */}
        <div className="max-w-4xl mx-auto text-center pt-8 pb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-up">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{t("hero.badge")}</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display text-foreground mb-6 leading-tight animate-fade-up delay-100">
            {t("hero.title")}{" "}
            <span className="text-white">{t("hero.titleHighlight")}</span> {t("hero.titleEnd")}
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 animate-fade-up delay-200">
            {t("hero.subtitle")}
          </p>

          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground animate-fade-up delay-300">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              {t("hero.proof1")}
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              {t("hero.proof2")}
            </p>
          </div>
        </div>

        {/* MAIN CTA CARD */}
        <div className="max-w-2xl mx-auto mb-16 animate-fade-up delay-400">
          <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-card-premium relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <div className="relative">
              <ResumeFlow onAnalyze={handleFlowAnalyze} isLoading={isLoading} />
            </div>
          </div>
        </div>

        {/* PROOF POINTS */}
        <div className="max-w-3xl mx-auto mb-20 animate-fade-up">
          <h2 className="text-xl md:text-2xl font-bold font-display text-center text-foreground mb-8">
            {t("proof.title")}
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {proofPoints.map((point, i) => (
              <div key={i} className="flex items-center gap-4 p-5 rounded-xl bg-card/50 border border-border backdrop-blur-sm hover-lift group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <point.icon className="w-6 h-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">{point.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="max-w-4xl mx-auto mb-20 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-center text-foreground mb-12">
            {t("how.title")}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-8 h-8 text-primary" />
                </div>
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground font-bold text-sm mb-3">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* WHAT YOU GET (PRO) */}
        <div className="max-w-2xl mx-auto mb-20 animate-fade-up">
          <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/5 border border-primary/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-display text-foreground">{t("pro.title")}</h2>
                <p className="text-sm text-primary font-medium">{t("pro.subtitle")}</p>
              </div>
            </div>
            <div className="space-y-3">
              {proFeatures.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TARGET AUDIENCE */}
        <div className="max-w-3xl mx-auto mb-20 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-center text-foreground mb-4">
            {t("target.title")}
          </h2>
          <p className="text-center text-muted-foreground mb-8">{t("target.subtitle")}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {targetAudience.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-accent" />
                </div>
                <p className="text-foreground text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* PRICING */}
        <PricingSection />

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-20 animate-fade-up">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-center text-foreground mb-8">
            {t("faq.title")}
          </h2>
          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="bg-card/50 border border-border rounded-xl px-5">
                <AccordionTrigger className="text-foreground font-medium hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* MENTORSHIP */}
        <MentorshipSection />

        {/* CONTACT */}
        <div className="text-center mt-16 animate-fade-up">
          <p className="text-muted-foreground mb-4">{t("contact.title")}</p>
          <Button variant="outline" asChild className="gap-2">
            <a href="mailto:contato@cvxapp.com">
              <Mail className="w-4 h-4" />
              {t("contact.cta")}
            </a>
          </Button>
        </div>
      </main>

      {isLoading && <AnalysisLoading />}

      <AnalysisModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} result={analysisResult} isPremium={isPremiumResult} />
    </div>
  );
};

export default Index;
