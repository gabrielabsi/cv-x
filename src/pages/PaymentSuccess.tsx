import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2, FileText, ArrowRight, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { analyzeVerifiedPremium } from "@/lib/analysis";
import cvxLogo from "@/assets/cvx-logo.png";

interface AnalysisResult {
  score: number;
  summary: string;
  strengths?: string[];
  weaknesses?: string[];
  improvements?: string[];
  missingKeywords?: string[];
  suggestedJobTitles?: string[];
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "generating" | "success" | "error">("loading");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const generatePremiumReport = async () => {
      if (!sessionId) {
        setStatus("error");
        return;
      }

      // Retrieve stored analysis data
      const storedData = sessionStorage.getItem("cvx_pending_analysis");
      if (!storedData) {
        toast({
          title: "Sessão expirada",
          description: "Por favor, faça uma nova análise.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setStatus("generating");

      try {
        const { resumeText, linkedInUrl, jobDescription } = JSON.parse(storedData);

        // Server-side payment verification before generating premium report
        const premiumResult = await analyzeVerifiedPremium({
          sessionId,
          resumeText,
          linkedInUrl,
          jobDescription,
        });

        setResult(premiumResult);
        setStatus("success");

        // Clear stored data
        sessionStorage.removeItem("cvx_pending_analysis");

        toast({
          title: "Relatório gerado!",
          description: "Seu relatório premium está pronto.",
        });
      } catch (error) {
        console.error("Error generating premium report:", error);
        setStatus("error");
        toast({
          title: "Erro ao gerar relatório",
          description: "Pagamento não verificado ou erro ao gerar relatório.",
          variant: "destructive",
        });
      }
    };

    generatePremiumReport();
  }, [sessionId, navigate, toast]);

  if (status === "loading" || status === "generating") {
    return (
      <div className="min-h-screen gradient-hero neural-pattern flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="w-20 h-20 mx-auto rounded-2xl gradient-primary flex items-center justify-center animate-pulse">
            <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground mb-2">
              {status === "loading" ? "Verificando pagamento..." : "Gerando seu relatório..."}
            </h1>
            <p className="text-muted-foreground">
              {status === "generating" && "Isso pode levar alguns segundos"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen gradient-hero neural-pattern flex items-center justify-center">
        <div className="text-center space-y-6 p-8 max-w-md">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-destructive/20 flex items-center justify-center">
            <FileText className="w-10 h-10 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground mb-2">
              Ops! Algo deu errado
            </h1>
            <p className="text-muted-foreground mb-6">
              Não foi possível gerar seu relatório. Entre em contato com o suporte se o problema persistir.
            </p>
            <Button variant="hero" onClick={() => navigate("/")}>
              Voltar ao início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero neural-pattern">
      <header className="container py-5">
        <div className="flex items-center gap-3">
          <img src={cvxLogo} alt="CVX" className="h-10 w-auto" />
        </div>
      </header>

      <main className="container pb-20">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-accent/20 flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-3xl font-bold font-display text-foreground mb-2">
              Pagamento confirmado!
            </h1>
            <p className="text-muted-foreground">
              Seu relatório premium está pronto para download
            </p>
          </div>

          {/* Result Card */}
          {result && (
            <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-card-premium space-y-6">
              {/* Score */}
              <div className="text-center py-6">
                <div className="text-6xl font-bold font-display text-foreground mb-2">
                  {result.score}%
                </div>
                <p className="text-muted-foreground">Compatibilidade com a vaga</p>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                <h4 className="font-semibold text-foreground mb-2">Resumo da Análise</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {result.summary}
                </div>
              </div>

              {/* Strengths */}
              {result.strengths && result.strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-accent" />
                    Pontos Fortes
                  </h4>
                  <ul className="space-y-2">
                    {result.strengths.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-accent">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {result.weaknesses && result.weaknesses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-destructive" />
                    Pontos a Melhorar
                  </h4>
                  <ul className="space-y-2">
                    {result.weaknesses.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-destructive">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {result.improvements && result.improvements.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-primary" />
                    Sugestões de Melhoria
                  </h4>
                  <ul className="space-y-2">
                    {result.improvements.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing Keywords */}
              {result.missingKeywords && result.missingKeywords.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Palavras-chave Faltantes</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map((keyword, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 text-xs rounded-lg bg-accent/10 text-accent font-medium border border-accent/20"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Job Titles */}
              {result.suggestedJobTitles && result.suggestedJobTitles.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    Vagas Mais Adequadas ao Seu Perfil
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.suggestedJobTitles.map((title, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 text-sm rounded-lg bg-primary/10 text-primary font-medium border border-primary/20"
                      >
                        {title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-border">
                <Button variant="hero" className="w-full" onClick={() => navigate("/")}>
                  Fazer Nova Análise
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PaymentSuccess;
