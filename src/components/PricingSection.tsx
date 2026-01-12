import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Zap, Crown, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Plan {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  analyses: string;
  icon: React.ElementType;
  features: string[];
  highlight?: string;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: "basico",
    name: "CVX Básico",
    price: "R$ 16,99",
    priceValue: 1699,
    analyses: "1 análise/mês",
    icon: Zap,
    features: [
      "1 análise completa por mês",
      "Relatório PDF detalhado",
      "Pontos fortes e fracos",
      "Palavras-chave faltantes",
      "Sugestões de melhoria",
    ],
  },
  {
    id: "intermediario",
    name: "CVX Intermediário",
    price: "R$ 24,99",
    priceValue: 2499,
    analyses: "10 análises/mês",
    icon: Crown,
    features: [
      "10 análises completas por mês",
      "4 currículos reescritos por mês",
      "Relatório PDF detalhado",
      "Pontos fortes e fracos",
      "Palavras-chave faltantes",
      "Sugestões de melhoria",
      "⭐ Prioridade no suporte",
    ],
    highlight: "🎓 Mentoria por R$ 299/ano (valor promocional)",
    popular: true,
  },
  {
    id: "avancado",
    name: "CVX Avançado",
    price: "R$ 49,99",
    priceValue: 4999,
    analyses: "Ilimitado",
    icon: Rocket,
    features: [
      "Análises ilimitadas",
      "Currículos reescritos ilimitados",
      "Relatório PDF detalhado",
      "Pontos fortes e fracos",
      "Palavras-chave faltantes",
      "Sugestões de melhoria",
      "⭐ Suporte VIP prioritário",
      "Acesso antecipado a novidades",
    ],
    highlight: "🎓 Mentoria por R$ 199/ano (valor especial)",
  },
];

export function PricingSection() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubscribe = async (planId: string) => {
    // Require login before purchase
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login ou crie uma conta para assinar um plano.",
      });
      navigate("/auth?redirect=/");
      return;
    }
    
    setLoadingPlan(planId);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { productType: planId }
      });

      if (error) throw error;
      if (!data?.url) throw new Error("Falha ao criar sessão de pagamento");

      window.open(data.url, "_blank");
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section className="py-20 relative">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
          Planos de Assinatura
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Escolha o plano ideal para suas necessidades e tenha análises completas 
          com relatório PDF detalhado todo mês.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isLoading = loadingPlan === plan.id;
          
          return (
            <div
              key={plan.id}
              className={`relative p-6 rounded-2xl bg-card border transition-all hover-lift ${
                plan.popular 
                  ? "border-primary shadow-glow-sm" 
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  Mais Popular
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  plan.popular ? "bg-primary/20" : "bg-secondary"
                }`}>
                  <Icon className={`w-5 h-5 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.analyses}</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold font-display text-foreground">{plan.price}</span>
                <span className="text-muted-foreground">/mês</span>
              </div>

              {plan.highlight && (
                <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm font-medium text-primary">{plan.highlight}</p>
                </div>
              )}

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? "hero" : "outline"}
                className="w-full"
                onClick={() => handleSubscribe(plan.id)}
                disabled={isLoading}
              >
                {isLoading ? "Aguarde..." : "Assinar Agora"}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        Cancele a qualquer momento • Pagamento seguro via Stripe
      </p>
    </section>
  );
}
