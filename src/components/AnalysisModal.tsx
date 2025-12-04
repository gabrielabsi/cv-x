import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FitThermometer } from "./FitThermometer";
import { Sparkles, Download, ArrowRight, CheckCircle2 } from "lucide-react";

interface AnalysisResult {
  score: number;
  summary: string;
  strengths?: string[];
  weaknesses?: string[];
  improvements?: string[];
  missingKeywords?: string[];
}

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AnalysisResult | null;
  onUpgrade: () => void;
  isPremium?: boolean;
}

export function AnalysisModal({ isOpen, onClose, result, onUpgrade, isPremium }: AnalysisModalProps) {
  if (!result) return null;

  const premiumFeatures = [
    "Análise detalhada de forças e fraquezas",
    "Palavras-chave faltantes",
    "Sugestões de melhoria personalizadas",
    "Relatório completo em PDF",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            {isPremium ? "Relatório Completo" : "Resultado da Análise"}
          </DialogTitle>
          <DialogDescription>
            {isPremium 
              ? "Aqui está sua análise detalhada do currículo"
              : "Veja como seu currículo se compara com a vaga"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Thermometer */}
          <div className="flex justify-center py-4">
            <FitThermometer score={result.score} />
          </div>

          {/* Summary */}
          <div className="p-4 rounded-xl bg-secondary/50">
            <h4 className="font-semibold text-foreground mb-2">Resumo</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.summary}
            </p>
          </div>

          {isPremium ? (
            <>
              {/* Strengths */}
              {result.strengths && result.strengths.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                    Pontos Fortes
                  </h4>
                  <ul className="space-y-1">
                    {result.strengths.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground pl-6 relative before:content-['•'] before:absolute before:left-2 before:text-accent">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {result.weaknesses && result.weaknesses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Pontos a Melhorar</h4>
                  <ul className="space-y-1">
                    {result.weaknesses.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground pl-6 relative before:content-['•'] before:absolute before:left-2 before:text-destructive">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {result.improvements && result.improvements.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Sugestões de Melhoria</h4>
                  <ul className="space-y-1">
                    {result.improvements.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground pl-6 relative before:content-['•'] before:absolute before:left-2 before:text-primary">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Keywords */}
              {result.missingKeywords && result.missingKeywords.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Palavras-chave Faltantes</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map((keyword, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="gradient" className="w-full" onClick={onClose}>
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF Completo
              </Button>
            </>
          ) : (
            <>
              {/* Premium CTA */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                <h4 className="font-semibold text-foreground mb-3">
                  Desbloqueie o relatório completo
                </h4>
                <ul className="space-y-2 mb-4">
                  {premiumFeatures.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="accent" className="w-full" onClick={onUpgrade}>
                  Obter por R$ 4,99
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
