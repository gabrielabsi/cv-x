import { useState, useEffect } from "react";
import { History, Trash2, ExternalLink, Cloud, HardDrive } from "lucide-react";
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
    <div className="w-full max-w-2xl mx-auto mt-12 animate-fade-up delay-400">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Análises Recentes
          {user ? (
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Cloud className="w-3 h-3" /> Sincronizado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <HardDrive className="w-3 h-3" /> Local
            </span>
          )}
        </h3>
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <Trash2 className="w-4 h-4 mr-2" />
          Limpar
        </Button>
      </div>

      <div className="space-y-3">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors cursor-pointer group"
            onClick={() => onViewResult(item)}
          >
            <div className="w-12 h-12 flex-shrink-0">
              <FitThermometer score={item.score} animate={false} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{item.jobTitle}</p>
              <p className="text-sm text-muted-foreground">{formatDate(item.date)}</p>
            </div>
            <div className="flex items-center gap-2">
              {item.isPremium && (
                <span className="px-2 py-1 text-xs rounded-full bg-accent/20 text-accent font-medium">
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
