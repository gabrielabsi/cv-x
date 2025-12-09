import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import cvxLogo from "@/assets/cvx-logo.png";

const SubscriptionSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any pending analysis data
    sessionStorage.removeItem("cvx_pending_analysis");
  }, []);

  return (
    <div className="min-h-screen gradient-hero neural-pattern">
      <header className="container py-5">
        <div className="flex items-center gap-3">
          <img src={cvxLogo} alt="CVX" className="h-10 w-auto" />
        </div>
      </header>

      <main className="container pb-20">
        <div className="max-w-lg mx-auto text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 mx-auto rounded-full bg-accent/20 flex items-center justify-center mb-8 animate-fade-up">
            <CheckCircle className="w-12 h-12 text-accent" />
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4 animate-fade-up delay-100">
            Assinatura Ativada!
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 animate-fade-up delay-200">
            Parabéns! Sua assinatura foi confirmada com sucesso. 
            Você agora tem acesso a todas as análises premium do seu plano.
          </p>

          {/* Benefits Card */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-card-premium mb-8 animate-fade-up delay-300">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Crown className="w-6 h-6 text-primary" />
              <span className="text-lg font-semibold text-foreground">Benefícios Ativos</span>
            </div>
            <ul className="space-y-3 text-left">
              <li className="flex items-center gap-3 text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                Relatórios PDF detalhados
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                Análise completa de pontos fortes e fracos
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                Sugestões personalizadas de melhoria
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                Palavras-chave faltantes identificadas
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up delay-400">
            <Button variant="hero" onClick={() => navigate("/")} className="gap-2">
              Fazer Análise
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/members")}>
              Minha Conta
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubscriptionSuccess;