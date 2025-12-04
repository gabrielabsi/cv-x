import { useState, useEffect } from "react";
import { History, Trash2, ExternalLink, Cloud, HardDrive, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FitThermometer } from "./FitThermometer";
import { useAuth } from "@/hooks/useAuth";
import {
  HistoryItem,
  getLocalHistory,
  clearLocalHistory,
  getCloudHistory,
  clearCloudHistory,
} from "@/lib/history";

interface HistorySectionProps {
  onViewResult: (item: HistoryItem) => void;
  refreshTrigger?: number;
}

export function HistorySection({ onViewResult, refreshTrigger }: HistorySectionProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadHistory();
  }, [user, refreshTrigger]);

  const loadHistory = async () => {
    setIsLoading(true);
    if (user) {
      const cloudHistory = await getCloudHistory(user.id);
      setHistory(cloudHistory);
    } else {
      setHistory(getLocalHistory());
    }
    setIsLoading(false);
  };

  const handleClear = async () => {
    if (user) {
      await clearCloudHistory(user.id);
    } else {
      clearLocalHistory();
    }
    setHistory([]);
  };

  if (isLoading) {
    return null;
  }

  if (history.length === 0) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-16 animate-fade-up delay-500">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold font-display text-foreground flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="w-4 h-4 text-primary" />
          </div>
          Análises Recentes
          {user ? (
            <span className="flex items-center gap-1.5 text-xs font-normal text-accent bg-accent/10 px-2 py-1 rounded-full">
              <Cloud className="w-3 h-3" /> Sincronizado
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground bg-secondary px-2 py-1 rounded-full">
              <HardDrive className="w-3 h-3" /> Local
            </span>
          )}
        </h3>
        <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Limpar
        </Button>
      </div>

      <div className="space-y-3">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border hover:border-primary/30 hover:bg-card transition-all duration-200 cursor-pointer group backdrop-blur-sm"
            onClick={() => onViewResult(item)}
          >
            <div className="w-12 h-12 flex-shrink-0">
              <FitThermometer score={item.score} animate={false} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {item.jobTitle}
              </p>
              <p className="text-sm text-muted-foreground">{formatDate(item.date)}</p>
            </div>
            <div className="flex items-center gap-3">
              {item.isPremium && (
                <span className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-gradient-to-r from-primary/20 to-accent/20 text-accent font-medium border border-accent/20">
                  <Crown className="w-3 h-3" />
                  Premium
                </span>
              )}
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { HistoryItem };
