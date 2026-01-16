import { useState } from "react";
import { 
  FileText, 
  TrendingUp, 
  RefreshCw,
  ChevronRight,
  Loader2,
  Sparkles,
  AlertTriangle,
  Check,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResumeInput } from "@/components/ResumeInput";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { extractTextFromFile } from "@/lib/analysis";
import { supabase } from "@/integrations/supabase/client";

interface Improvement {
  title: string;
  description: string;
}

interface ResumeFlowProps {
  onAnalyze: (jobDescription: string, resumeText: string) => void;
  isLoading: boolean;
}

type FlowStep = "upload" | "choose" | "job-description" | "improvements";

export const ResumeFlow = ({ onAnalyze, isLoading }: ResumeFlowProps) => {
  const [step, setStep] = useState<FlowStep>("upload");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [linkedInProfileData, setLinkedInProfileData] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [summary, setSummary] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const handleImportResume = async () => {
    if (!selectedFile && !linkedInUrl.trim() && !linkedInProfileData.trim()) {
      toast({
        title: t("flow.requiredResume"),
        description: t("flow.requiredResumeDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      let text = linkedInProfileData || "";
      if (selectedFile) {
        text = await extractTextFromFile(selectedFile);
      }

      if (!text || text.trim().length < 100) {
        throw new Error(t("flow.notEnoughText"));
      }

      setResumeText(text);
      setStep("choose");
    } catch (error) {
      toast({
        title: t("flow.importError"),
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChooseCompare = () => {
    setStep("job-description");
  };

  const handleChooseRewrite = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-improvements", {
        body: { resumeText },
      });

      if (error) throw error;

      if (!data?.improvements) {
        throw new Error(t("flow.analysisError"));
      }

      setImprovements(data.improvements);
      setOverallScore(data.overallScore || 70);
      setSummary(data.summary || "");
      setStep("improvements");
    } catch (error) {
      toast({
        title: t("flow.analysisError"),
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCompareSubmit = () => {
    if (!jobDescription.trim() || jobDescription.trim().length < 50) {
      toast({
        title: t("flow.jobRequired"),
        description: t("flow.jobRequiredDesc"),
        variant: "destructive",
      });
      return;
    }
    onAnalyze(jobDescription, resumeText);
  };

  const handlePurchase = async (format: "pdf" | "docx") => {
    setIsCheckingOut(true);
    try {
      // Store resume text in sessionStorage for after payment
      sessionStorage.setItem("cvx_rewrite_resume", resumeText);

      const { data, error } = await supabase.functions.invoke("create-cv-checkout", {
        body: { format, resumeText },
      });

      if (error) throw error;

      if (!data?.url) {
        throw new Error(t("flow.checkoutError"));
      }

      window.location.href = data.url;
    } catch (error) {
      toast({
        title: t("flow.checkoutError"),
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleBack = () => {
    if (step === "choose" || step === "job-description" || step === "improvements") {
      setStep("upload");
      setImprovements([]);
    }
  };

  const getScoreColor = () => {
    if (overallScore >= 70) return "text-accent";
    if (overallScore >= 40) return "text-yellow-500";
    return "text-destructive";
  };

  // Prices based on language
  const pdfPrice = language === "en" ? "$1.99" : "R$ 4,99";
  const wordPrice = language === "en" ? "$4.99" : "R$ 9,99";

  // Step 1: Upload Resume
  if (step === "upload") {
    return (
      <div className="space-y-6">
        <div>
          <Label className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">1</span>
            {t("flow.step1")}
          </Label>
          <ResumeInput
            selectedFile={selectedFile}
            onFileChange={setSelectedFile}
            linkedInUrl={linkedInUrl}
            onLinkedInChange={setLinkedInUrl}
            onLinkedInProfileData={setLinkedInProfileData}
            isLoading={isAnalyzing}
          />
        </div>

        <Button
          variant="hero"
          className="w-full group"
          onClick={handleImportResume}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <FileText className="w-5 h-5" />
              {t("flow.importButton")}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </div>
    );
  }

  // Step 2: Choose Action
  if (step === "choose") {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            {t("flow.imported")}
          </h3>
          <p className="text-muted-foreground">
            {t("flow.whatToDo")}
          </p>
        </div>

        <div className="grid gap-4">
          <Button
            variant="outline"
            className="h-auto p-5 flex items-start gap-4 text-left hover:border-primary/50 hover:bg-primary/5"
            onClick={handleChooseCompare}
            disabled={isAnalyzing}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-foreground mb-1">
                {t("flow.compareTitle")}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("flow.compareDesc")}
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-5 flex items-start gap-4 text-left hover:border-accent/50 hover:bg-accent/5"
            onClick={handleChooseRewrite}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-6 h-6 text-accent animate-spin" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-6 h-6 text-accent" />
              </div>
            )}
            <div>
              <div className="font-semibold text-foreground mb-1 flex items-center gap-2">
                {t("flow.rewriteTitle")}
                <span className="px-2 py-0.5 text-xs rounded-full bg-accent/20 text-accent">
                  {t("flow.premium")}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {t("flow.rewriteDesc")}
              </div>
            </div>
          </Button>
        </div>

        <Button variant="ghost" className="w-full" onClick={handleBack}>
          {t("flow.back")}
        </Button>
      </div>
    );
  }

  // Step 3a: Job Description for Compare
  if (step === "job-description") {
    return (
      <div className="space-y-6">
        <div>
          <Label className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">2</span>
            {t("flow.step2")}
          </Label>
          <div className="relative group">
            <div className="absolute left-4 top-4 w-5 h-5 rounded bg-accent/20 flex items-center justify-center">
              <FileText className="w-3 h-3 text-accent" />
            </div>
            <Textarea
              placeholder={t("flow.jobPlaceholder")}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="pl-12 min-h-[150px] bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 transition-all resize-none"
              disabled={isLoading}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("flow.jobHint")}
          </p>
        </div>

        <Button
          variant="hero"
          className="w-full group"
          onClick={handleCompareSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <TrendingUp className="w-5 h-5" />
              {t("flow.analyze")}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>

        <Button variant="ghost" className="w-full" onClick={handleBack}>
          {t("flow.back")}
        </Button>
      </div>
    );
  }

  // Step 3b: Improvements + Paywall
  if (step === "improvements") {
    return (
      <div className="space-y-6">
        {/* Score Card */}
        <div className="p-5 rounded-xl bg-secondary/50 border border-border text-center">
          <div className={`text-4xl font-bold font-display ${getScoreColor()} mb-2`}>
            {overallScore}%
          </div>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>

        {/* Improvements */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            {t("flow.improvements")}
          </h4>
          {improvements.map((improvement, index) => (
            <div key={index} className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <div className="font-semibold text-foreground text-sm mb-1">
                {index + 1}. {improvement.title}
              </div>
              <p className="text-sm text-muted-foreground">
                {improvement.description}
              </p>
            </div>
          ))}
        </div>

        {/* Paywall */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-primary/30">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-foreground">{t("flow.optimizedVersion")}</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("flow.optimizedDesc")}
          </p>

          <div className="grid gap-3">
            <Button
              variant="outline"
              className="w-full justify-between h-auto p-4"
              onClick={() => handlePurchase("pdf")}
              disabled={isCheckingOut}
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">{t("flow.downloadPdf")}</div>
                  <div className="text-xs text-muted-foreground">{t("flow.pdfDesc")}</div>
                </div>
              </div>
              <div className="text-lg font-bold text-primary">{pdfPrice}</div>
            </Button>

            <Button
              variant="hero"
              className="w-full justify-between h-auto p-4"
              onClick={() => handlePurchase("docx")}
              disabled={isCheckingOut}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-semibold">{t("flow.downloadWord")}</div>
                  <div className="text-xs opacity-80">{t("flow.wordDesc")}</div>
                </div>
              </div>
              <div className="text-lg font-bold">{wordPrice}</div>
            </Button>
          </div>

          {isCheckingOut && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("flow.redirecting")}
            </div>
          )}
        </div>

        <Button variant="ghost" className="w-full" onClick={handleBack}>
          {t("flow.startOver")}
        </Button>
      </div>
    );
  }

  return null;
};
