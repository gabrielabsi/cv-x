import { TrendingUp, Crown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SubscriptionInfo {
  subscribed: boolean;
  product_name: string | null;
  subscription_end: string | null;
  analyses_used: number;
  analyses_limit: number;
}

interface SubscriptionCardProps {
  subscription: SubscriptionInfo;
  onGenerateAnalysis: () => void;
  isLoading: boolean;
}

export const SubscriptionCard = ({ 
  subscription, 
  onGenerateAnalysis,
  isLoading 
}: SubscriptionCardProps) => {
  const isUnlimited = subscription.analyses_limit >= 999999;
  const usagePercentage = isUnlimited 
    ? 0 
    : (subscription.analyses_used / subscription.analyses_limit) * 100;
  const hasReachedLimit = !isUnlimited && subscription.analyses_used >= subscription.analyses_limit;

  if (!subscription.subscribed) {
    return (
      <div className="p-6 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Sem Assinatura Ativa</h3>
            <p className="text-sm text-muted-foreground">
              Assine um plano para gerar análises detalhadas
            </p>
          </div>
        </div>
        <Button 
          variant="hero" 
          className="w-full"
          onClick={() => window.location.href = "/#pricing"}
        >
          <Crown className="w-4 h-4 mr-2" />
          Ver Planos
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-card border border-primary/30 shadow-glow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Crown className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{subscription.product_name}</h3>
          {subscription.subscription_end && (
            <p className="text-sm text-muted-foreground">
              Renova em {format(new Date(subscription.subscription_end), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          )}
        </div>
      </div>

      {/* Usage Counter */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">Análises utilizadas</span>
          <span className="text-sm font-semibold text-foreground">
            {subscription.analyses_used} / {isUnlimited ? "∞" : subscription.analyses_limit}
          </span>
        </div>
        {!isUnlimited && (
          <Progress 
            value={usagePercentage} 
            className="h-2"
          />
        )}
        {isUnlimited && (
          <div className="h-2 rounded-full bg-primary/20 overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-primary to-accent animate-pulse" />
          </div>
        )}
      </div>

      {/* Generate Analysis Button */}
      <Button 
        variant="hero" 
        className="w-full"
        onClick={onGenerateAnalysis}
        disabled={hasReachedLimit || isLoading}
      >
        <TrendingUp className="w-4 h-4 mr-2" />
        {hasReachedLimit ? "Limite Atingido" : "Gerar Análise Detalhada"}
      </Button>

      {hasReachedLimit && (
        <p className="text-xs text-destructive text-center mt-2">
          Você atingiu o limite de análises deste período
        </p>
      )}
    </div>
  );
};
