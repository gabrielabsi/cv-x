import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FitThermometer } from "./FitThermometer";
import { Sparkles, Download, ArrowRight, CheckCircle2, AlertCircle, Lightbulb, Tag, Crown, Ticket } from "lucide-react";

interface AnalysisResult {
  score: number;
  summary: string;
  strengths?: string[];
  weaknesses?: string[];
  improvements?: string[];
  missingKeywords?: string[];
  detailedExplanation?: string;
  risks?: string[];
  jobTitle?: string;
  company?: string;
}

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AnalysisResult | null;
  onUpgrade?: (couponCode?: string) => void;
  isPremium?: boolean;
}

export function AnalysisModal({ isOpen, onClose, result, onUpgrade, isPremium }: AnalysisModalProps) {
  const [couponCode, setCouponCode] = useState("");
  const [showCouponInput, setShowCouponInput] = useState(false);
  
  if (!result) return null;

  const premiumFeatures = [
    "Análise detalhada de forças e fraquezas",
    "Palavras-chave faltantes identificadas",
    "Sugestões de melhoria personalizadas",
    "Relatório completo para download",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-display">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            {isPremium ? "Relatório Completo" : "Resultado da Análise"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isPremium 
              ? "Sua análise detalhada do currículo está pronta"
              : "Veja como seu currículo se compara com a vaga"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Thermometer */}
          <div className="flex justify-center py-6">
            <FitThermometer score={result.score} />
          </div>

          {/* Summary */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
              Resumo da Análise
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.summary}
            </p>
          </div>

          {isPremium ? (
            <>
              {/* Strengths */}
              {result.strengths && result.strengths.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-accent" />
                    </div>
                    Pontos Fortes
                  </h4>
                  <ul className="space-y-2">
                    {result.strengths.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground pl-7 relative">
                        <span className="absolute left-0 top-0.5 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-xs text-accent font-medium">
                          {i + 1}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {result.weaknesses && result.weaknesses.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-destructive/20 flex items-center justify-center">
                      <AlertCircle className="w-3 h-3 text-destructive" />
                    </div>
                    Pontos a Melhorar
                  </h4>
                  <ul className="space-y-2">
                    {result.weaknesses.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground pl-7 relative">
                        <span className="absolute left-0 top-0.5 w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center text-xs text-destructive font-medium">
                          {i + 1}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {result.improvements && result.improvements.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                      <Lightbulb className="w-3 h-3 text-primary" />
                    </div>
                    Sugestões de Melhoria
                  </h4>
                  <ul className="space-y-2">
                    {result.improvements.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground pl-7 relative">
                        <span className="absolute left-0 top-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-medium">
                          {i + 1}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Keywords */}
              {result.missingKeywords && result.missingKeywords.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center">
                      <Tag className="w-3 h-3 text-accent" />
                    </div>
                    Palavras-chave Faltantes
                  </h4>
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

              {/* Detailed Explanation */}
              {result.detailedExplanation && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-primary" />
                    </div>
                    Análise Detalhada
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {result.detailedExplanation}
                  </p>
                </div>
              )}

              <Button variant="gradient" className="w-full h-12" onClick={onClose}>
                Fechar Relatório
              </Button>
            </>
          ) : (
            <>
              {/* Premium CTA */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 via-transparent to-accent/10 border border-primary/20 relative overflow-hidden">
                {/* Glow effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl" />
                
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="w-5 h-5 text-accent" />
                    <h4 className="font-semibold font-display text-foreground">
                      Desbloqueie o relatório completo
                    </h4>
                  </div>
                  <ul className="space-y-2.5 mb-5">
                    {premiumFeatures.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button variant="premium" className="w-full h-12" onClick={() => onUpgrade?.(couponCode || undefined)}>
                    <Crown className="w-4 h-4" />
                    Obter Relatório por R$ 4,99
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  
                  {/* Coupon Input */}
                  <div className="mt-4 pt-4 border-t border-border/50">
                    {showCouponInput ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Digite o cupom"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-1 bg-secondary/50 border-border text-sm"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowCouponInput(false)}
                          className="text-muted-foreground"
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowCouponInput(true)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                      >
                        <Ticket className="w-4 h-4" />
                        Tenho um cupom de desconto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
