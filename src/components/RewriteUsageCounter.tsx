import { FileText } from "lucide-react";

interface RewriteUsageCounterProps {
  used: number;
  limit: number;
  productName?: string;
}

export const RewriteUsageCounter = ({ used, limit, productName }: RewriteUsageCounterProps) => {
  const isUnlimited = limit >= 999999;
  const remaining = Math.max(0, limit - used);
  const percentage = isUnlimited ? 100 : Math.min(100, (used / limit) * 100);
  
  return (
    <div className="p-4 rounded-xl bg-accent/10 border border-accent/30">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
          <FileText className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Currículos Reescritos</p>
          {productName && (
            <p className="text-xs text-muted-foreground">{productName}</p>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Usados este mês</span>
          <span className="font-semibold text-foreground">
            {isUnlimited ? (
              <span className="text-accent">Ilimitado ∞</span>
            ) : (
              <>
                <span className={remaining <= 1 ? "text-destructive" : "text-accent"}>
                  {remaining}
                </span>
                <span className="text-muted-foreground"> restantes</span>
              </>
            )}
          </span>
        </div>
        
        {!isUnlimited && (
          <>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  percentage >= 100 ? 'bg-destructive' : 
                  percentage >= 75 ? 'bg-yellow-500' : 'bg-accent'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {used} de {limit} utilizados
            </p>
          </>
        )}
      </div>
    </div>
  );
};
