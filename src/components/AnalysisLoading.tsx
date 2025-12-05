import { useEffect, useState } from "react";
import { Check, FileSearch, Brain, Sparkles, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const stages = [
  { icon: FileSearch, label: "Extraindo dados do currículo", duration: 2000 },
  { icon: Brain, label: "Processando com IA", duration: 3000 },
  { icon: Target, label: "Comparando com a vaga", duration: 2500 },
  { icon: Sparkles, label: "Gerando insights", duration: 2000 },
];

export const AnalysisLoading = () => {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = stages.reduce((acc, s) => acc + s.duration, 0);
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 100;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 95);
      setProgress(newProgress);

      // Calculate current stage
      let accumulatedTime = 0;
      for (let i = 0; i < stages.length; i++) {
        accumulatedTime += stages[i].duration;
        if (elapsed < accumulatedTime) {
          setCurrentStage(i);
          break;
        }
        if (i === stages.length - 1) {
          setCurrentStage(stages.length - 1);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 p-8 rounded-2xl bg-card border border-border shadow-card-premium">
        {/* AI Visual */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          {/* Outer pulse ring */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse-ring" />
          
          {/* Middle rotating ring */}
          <div className="absolute inset-2 rounded-full border border-accent/40 animate-orbit" style={{ animationDuration: '8s' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent shadow-glow-cyan" />
          </div>
          
          {/* Inner core */}
          <div className="absolute inset-6 rounded-full gradient-primary opacity-30 animate-pulse" />
          <div className="absolute inset-8 rounded-full bg-card border border-border flex items-center justify-center">
            <Brain className="w-8 h-8 text-primary animate-pulse" />
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <Progress value={progress} className="h-2 bg-secondary" />
          <p className="text-center text-sm text-muted-foreground mt-2">
            {Math.round(progress)}% concluído
          </p>
        </div>

        {/* Stages */}
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const isCompleted = index < currentStage;
            const isCurrent = index === currentStage;
            const StageIcon = stage.icon;

            return (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                  isCurrent
                    ? "bg-primary/10 border border-primary/30"
                    : isCompleted
                    ? "bg-accent/5 border border-accent/20"
                    : "bg-secondary/30 border border-transparent"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    isCompleted
                      ? "bg-accent/20 text-accent"
                      : isCurrent
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <StageIcon className={`w-4 h-4 ${isCurrent ? "animate-pulse" : ""}`} />
                  )}
                </div>
                <span
                  className={`text-sm font-medium transition-colors ${
                    isCompleted
                      ? "text-accent"
                      : isCurrent
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {stage.label}
                </span>
                {isCurrent && (
                  <div className="ml-auto flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Nossa IA está analisando seu currículo com precisão
        </p>
      </div>
    </div>
  );
};
