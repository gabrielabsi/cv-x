import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

const getStageMessage = (progress: number): string => {
  if (progress <= 25) return "Lendo suas informações...";
  if (progress <= 50) return "Entendendo os requisitos da vaga...";
  if (progress <= 75) return "Comparando seu perfil com o descritivo da vaga...";
  return "Gerando o seu relatório...";
};

export const AnalysisLoading = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 12000; // 12 seconds total
    const interval = 100;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += interval;
      const newProgress = Math.min((elapsed / duration) * 100, 95);
      setProgress(newProgress);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md bg-card border-border" hideCloseButton>
        <div className="flex flex-col items-center py-6">
          {/* AI Icon */}
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-card border border-border flex items-center justify-center">
              <Brain className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>

          {/* Progress percentage */}
          <div className="text-4xl font-bold text-foreground mb-2">
            {Math.round(progress)}%
          </div>

          {/* Stage message */}
          <p className="text-muted-foreground text-center mb-6 h-6">
            {getStageMessage(progress)}
          </p>

          {/* Progress bar */}
          <div className="w-full">
            <Progress value={progress} className="h-2 bg-secondary" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
