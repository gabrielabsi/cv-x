import { useState } from "react";
import { 
  Sparkles, 
  FileText, 
  ChevronRight, 
  Loader2,
  Lock,
  Target,
  Globe,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResumeInput } from "@/components/ResumeInput";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromFile } from "@/lib/analysis";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CVRewriteResult, RewriteContent } from "./CVRewriteResult";
import { RewriteUsageCounter } from "./RewriteUsageCounter";

interface CVRewriteCardProps {
  hasActiveSubscription: boolean;
  rewritesUsed?: number;
  rewritesLimit?: number;
  productName?: string;
  onUpgrade: () => void;
}

const LOADING_MESSAGES = [
  "Extraindo conteúdo...",
  "Analisando estrutura...",
  "Otimizando para ATS...",
  "Melhorando impacto...",
  "Reescrevendo com precisão...",
  "Finalizando...",
];

export const CVRewriteCard = ({ 
  hasActiveSubscription, 
  rewritesUsed = 0,
  rewritesLimit = 0,
  productName,
  onUpgrade 
}: CVRewriteCardProps) => {
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [linkedInProfileData, setLinkedInProfileData] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [language, setLanguage] = useState("pt-BR");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [rewriteResult, setRewriteResult] = useState<RewriteContent | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const hasRewriteAccess = rewritesLimit > 0;
  const hasReachedLimit = rewritesLimit < 999999 && rewritesUsed >= rewritesLimit;

  const handleRewrite = async () => {
    if (!hasActiveSubscription || !hasRewriteAccess) {
      onUpgrade();
      return;
    }

    if (hasReachedLimit) {
      toast({
        title: "Limite atingido",
        description: "Você já usou todos os seus currículos reescritos este mês.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile && !linkedInUrl.trim() && !linkedInProfileData.trim()) {
      toast({
        title: "Currículo obrigatório",
        description: "Envie um arquivo PDF/DOCX ou conecte seu LinkedIn.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setLoadingMessageIndex(0);
    setRewriteResult(null);

    // Animate loading messages
    const messageInterval = setInterval(() => {
      setLoadingMessageIndex((prev) => 
        prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 2000);

    try {
      let resumeText = linkedInProfileData || "";
      if (selectedFile) {
        resumeText = await extractTextFromFile(selectedFile);
      }

      if (!resumeText || resumeText.trim().length < 100) {
        throw new Error("Não foi possível extrair texto suficiente do currículo.");
      }

      const { data, error } = await supabase.functions.invoke("rewrite-cv", {
        body: {
          resumeText,
          jobDescription: jobDescription.trim() || undefined,
          targetRole: targetRole.trim() || undefined,
          language,
        },
      });

      if (error) throw error;

      if (!data?.success || !data?.rewrite) {
        throw new Error(data?.error || "Erro ao reescrever currículo.");
      }

      setRewriteResult(data.rewrite);
      
      toast({
        title: "Currículo reescrito!",
        description: "Sua versão otimizada está pronta.",
      });
    } catch (error) {
      toast({
        title: "Erro na reescrita",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      clearInterval(messageInterval);
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setRewriteResult(null);
    setJobDescription("");
    setTargetRole("");
    setSelectedFile(null);
    setLinkedInUrl("");
    setLinkedInProfileData("");
  };

  // If we have a result, show the result component
  if (rewriteResult) {
    return (
      <CVRewriteResult 
        content={rewriteResult} 
        onNewRewrite={handleReset}
      />
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-primary/30 relative overflow-hidden">
      {/* Premium badge */}
      <div className="absolute top-4 right-4">
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary/20 text-primary flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Premium
        </span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-display text-foreground">
              Reescrever Currículo
            </h3>
            <p className="text-sm text-muted-foreground">
              Versão otimizada para ATS e recrutadores
            </p>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-2xl">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium text-foreground animate-pulse">
            {LOADING_MESSAGES[loadingMessageIndex]}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Isso pode levar alguns segundos...
          </p>
        </div>
      )}

      {!hasActiveSubscription || !hasRewriteAccess ? (
        /* Paywall */
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h4 className="text-lg font-semibold text-foreground mb-2">
            {hasActiveSubscription ? "Upgrade Necessário" : "Funcionalidade Premium"}
          </h4>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            {hasActiveSubscription 
              ? "Seu plano atual não inclui reescrita de currículo. Faça upgrade para o plano Intermediário ou Avançado."
              : "Assine um plano para ter acesso à reescrita inteligente do seu currículo."
            }
          </p>
          <Button variant="hero" onClick={onUpgrade}>
            {hasActiveSubscription ? "Fazer Upgrade" : "Ver Planos"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      ) : hasReachedLimit ? (
        /* Limit reached */
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h4 className="text-lg font-semibold text-foreground mb-2">
            Limite Mensal Atingido
          </h4>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Você já usou seus {rewritesLimit} currículos reescritos este mês. 
            Faça upgrade para o plano Avançado para ter reescritas ilimitadas.
          </p>
          <Button variant="hero" onClick={onUpgrade}>
            Fazer Upgrade
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        /* Form */
        <div className="space-y-5">
          {/* Usage Counter */}
          {hasRewriteAccess && (
            <RewriteUsageCounter 
              used={rewritesUsed} 
              limit={rewritesLimit}
              productName={productName}
            />
          )}

          {/* Resume Input */}
          <div>
            <Label className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">1</span>
              Seu Currículo
            </Label>
            <ResumeInput
              selectedFile={selectedFile}
              onFileChange={setSelectedFile}
              linkedInUrl={linkedInUrl}
              onLinkedInChange={setLinkedInUrl}
              onLinkedInProfileData={setLinkedInProfileData}
              isLoading={isLoading}
            />
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                Cargo Alvo (opcional)
              </Label>
              <Input
                placeholder="Ex: Head de Operações"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                disabled={isLoading}
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                Idioma de Saída
              </Label>
              <Select value={language} onValueChange={setLanguage} disabled={isLoading}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (BR)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Job Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Descrição da Vaga (opcional)
            </Label>
            <Textarea
              placeholder="Cole a descrição da vaga para otimização de keywords e alinhamento..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[100px] bg-secondary/50 resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Incluir a vaga ajuda a otimizar keywords e alinhar o currículo
            </p>
          </div>

          {/* Action Button */}
          <Button
            variant="hero"
            className="w-full group"
            onClick={handleRewrite}
            disabled={isLoading}
          >
            <Sparkles className="w-5 h-5" />
            Gerar Versão Reescrita
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      )}
    </div>
  );
};
