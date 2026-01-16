import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Zap, Crown, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSecureCheckout } from "@/hooks/useSecureCheckout";
import { useLanguage } from "@/contexts/LanguageContext";
import { CouponInput } from "@/components/CouponInput";

interface Plan {
  id: string;
  nameKey: string;
  pricePT: string;
  priceEN: string;
  analysesKey: string;
  icon: React.ElementType;
  featureKeys: string[];
  highlightKey?: string;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: "basico",
    nameKey: "pricing.basic.name",
    pricePT: "R$ 16,99",
    priceEN: "$9.99",
    analysesKey: "pricing.basic.analyses",
    icon: Zap,
    featureKeys: [
      "pricing.basic.feature1",
      "pricing.basic.feature2",
      "pricing.basic.feature3",
      "pricing.basic.feature4",
      "pricing.basic.feature5",
    ],
  },
  {
    id: "intermediario",
    nameKey: "pricing.intermediate.name",
    pricePT: "R$ 24,99",
    priceEN: "$14.99",
    analysesKey: "pricing.intermediate.analyses",
    icon: Crown,
    featureKeys: [
      "pricing.intermediate.feature1",
      "pricing.intermediate.feature2",
      "pricing.intermediate.feature3",
      "pricing.intermediate.feature4",
      "pricing.intermediate.feature5",
      "pricing.intermediate.feature6",
    ],
    highlightKey: "pricing.intermediate.highlight",
    popular: true,
  },
  {
    id: "avancado",
    nameKey: "pricing.advanced.name",
    pricePT: "R$ 49,99",
    priceEN: "$29.99",
    analysesKey: "pricing.advanced.analyses",
    icon: Rocket,
    featureKeys: [
      "pricing.advanced.feature1",
      "pricing.advanced.feature2",
      "pricing.advanced.feature3",
      "pricing.advanced.feature4",
      "pricing.advanced.feature5",
      "pricing.advanced.feature6",
      "pricing.advanced.feature7",
    ],
    highlightKey: "pricing.advanced.highlight",
  },
];

export function PricingSection() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const { startCheckout } = useSecureCheckout();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const handleSubscribe = async (planId: string) => {
    // Require login before purchase
    if (!user) {
      toast({
        title: t("auth.loginRequired"),
        description: t("auth.loginRequiredDesc"),
      });
      navigate("/auth?redirect=/");
      return;
    }
    
    setLoadingPlan(planId);
    
    try {
      // Use language-specific plan IDs for checkout
      const checkoutPlanId = language === "en" ? `${planId}_en` : planId;
      await startCheckout(checkoutPlanId, { couponCode: couponCode || undefined });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section className="py-20 relative">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
          {t("pricing.title")}
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("pricing.subtitle")}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isLoading = loadingPlan === plan.id;
          const price = language === "en" ? plan.priceEN : plan.pricePT;
          
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
                  {t("pricing.popular")}
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  plan.popular ? "bg-primary/20" : "bg-secondary"
                }`}>
                  <Icon className={`w-5 h-5 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t(plan.nameKey)}</h3>
                  <p className="text-xs text-muted-foreground">{t(plan.analysesKey)}</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold font-display text-foreground">{price}</span>
                <span className="text-muted-foreground">{t("pricing.perMonth")}</span>
              </div>

              {plan.highlightKey && (
                <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm font-medium text-primary">{t(plan.highlightKey)}</p>
                </div>
              )}

              <ul className="space-y-3 mb-6">
                {plan.featureKeys.map((featureKey, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{t(featureKey)}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? "hero" : "outline"}
                className="w-full"
                onClick={() => handleSubscribe(plan.id)}
                disabled={isLoading}
              >
                {isLoading ? t("pricing.loading") : t("pricing.subscribe")}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="max-w-md mx-auto mt-8">
        <CouponInput 
          value={couponCode} 
          onChange={setCouponCode} 
          disabled={!!loadingPlan}
        />
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        {t("pricing.cancel")}
      </p>
    </section>
  );
}
