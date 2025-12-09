import { useState } from "react";
import { Crown, Rocket, Check, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpgradeSectionProps {
  currentProductId: string | null;
  showAllPlans?: boolean;
}

interface UpgradePlan {
  id: string;
  name: string;
  price: string;
  analyses: string;
  icon: React.ElementType;
  features: string[];
  productId: string;
}

const allPlans: UpgradePlan[] = [
  {
    id: "basico",
    name: "CVX Básico",
    price: "R$ 16,99",
    analyses: "8 análises/mês",
    icon: Crown,
    productId: "prod_SoLMeWK4h9D90o",
    features: [
      "8 análises completas por mês",
      "Relatório PDF detalhado",
      "Suporte por email",
    ],
  },
  {
    id: "intermediario",
    name: "CVX Intermediário",
    price: "R$ 24,99",
    analyses: "12 análises/mês",
    icon: Crown,
    productId: "prod_SoLNLB46DyQGr1",
    features: [
      "12 análises completas por mês",
      "Relatório PDF detalhado",
      "Prioridade no suporte",
    ],
  },
  {
    id: "avancado",
    name: "CVX Avançado",
    price: "R$ 49,99",
    analyses: "Ilimitado",
    icon: Rocket,
    productId: "prod_SoLNjxp9RQNJIo",
    features: [
      "Análises ilimitadas",
      "Relatório PDF detalhado",
      "Suporte prioritário",
      "Acesso antecipado a novidades",
    ],
  },
];

export function UpgradeSection({ currentProductId, showAllPlans = false }: UpgradeSectionProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { toast } = useToast();

  // Filter plans based on current subscription
  const availablePlans = allPlans.filter(plan => {
    // If showing all plans (for non-subscribers), show all
    if (showAllPlans || !currentProductId) {
      return true;
    }
    
    // Advanced users don't need upgrade
    if (currentProductId === "prod_SoLNjxp9RQNJIo") {
      return false;
    }
    
    if (currentProductId === "prod_SoLMeWK4h9D90o") {
      // Basic user can upgrade to intermediate or advanced
      return plan.id === "intermediario" || plan.id === "avancado";
    }
    if (currentProductId === "prod_SoLNLB46DyQGr1") {
      // Intermediate user can only upgrade to advanced
      return plan.id === "avancado";
    }
    return true;
  });

  const handleUpgrade = async (planId: string) => {
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

  if (availablePlans.length === 0) return null;

  return (
    <section className="py-16 relative">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <ArrowUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Upgrade Disponível</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
          Faça Upgrade do seu Plano
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Desbloqueie mais análises e recursos premium para impulsionar sua carreira.
        </p>
      </div>

      <div className={`grid gap-6 max-w-4xl mx-auto ${availablePlans.length === 1 ? 'md:grid-cols-1 max-w-md' : 'md:grid-cols-2'}`}>
        {availablePlans.map((plan) => {
          const Icon = plan.icon;
          const isLoading = loadingPlan === plan.id;
          
          return (
            <div
              key={plan.id}
              className="relative p-6 rounded-2xl bg-card border border-primary/30 shadow-glow-sm transition-all hover-lift"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
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

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant="hero"
                className="w-full"
                onClick={() => handleUpgrade(plan.id)}
                disabled={isLoading}
              >
                <ArrowUp className="w-4 h-4 mr-2" />
                {isLoading ? "Aguarde..." : "Fazer Upgrade"}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
