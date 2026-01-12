import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  Download, 
  FileText, 
  Loader2, 
  Check,
  Copy,
  ArrowLeft,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import cvxLogo from "@/assets/cvx-logo.png";

interface RewriteContent {
  headline: string;
  summary: string;
  experience: Array<{ company: string; role: string; date: string; bullets: string[] }>;
  skills: string[];
  education: string;
}

const CVDownload = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rewriteContent, setRewriteContent] = useState<RewriteContent | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [format, setFormat] = useState<string>("pdf");
  const [copied, setCopied] = useState(false);

  const sessionId = searchParams.get("session_id");
  const formatParam = searchParams.get("format");

  useEffect(() => {
    if (formatParam) setFormat(formatParam);
  }, [formatParam]);

  useEffect(() => {
    const generateDocument = async () => {
      if (!sessionId) {
        setError("Sessão de pagamento não encontrada");
        setIsLoading(false);
        return;
      }

      try {
        // Get resume text from sessionStorage
        const resumeText = sessionStorage.getItem("cvx_rewrite_resume");
        
        if (!resumeText) {
          setError("Texto do currículo não encontrado. Por favor, tente novamente desde o início.");
          setIsLoading(false);
          return;
        }

        // Generate the document
        const { data, error: genError } = await supabase.functions.invoke("generate-cv-document", {
          body: { resumeText, format, sessionId },
        });

        if (genError) throw genError;

        if (!data?.success || !data?.rewrite) {
          throw new Error("Erro ao gerar documento");
        }

        setRewriteContent(data.rewrite);
        setHtmlContent(data.html);
        
        // Clear sessionStorage
        sessionStorage.removeItem("cvx_rewrite_resume");

      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao gerar documento");
      } finally {
        setIsLoading(false);
      }
    };

    generateDocument();
  }, [sessionId, format]);

  const handleDownload = () => {
    if (!htmlContent) return;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `curriculo-otimizado.${format === "docx" ? "html" : "html"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download iniciado!",
      description: format === "docx" 
        ? "Abra o arquivo HTML no Word e salve como .docx"
        : "Abra o arquivo HTML no navegador e salve como PDF (Ctrl+P)",
    });
  };

  const handleCopyAll = async () => {
    if (!rewriteContent) return;

    const text = generatePlainText(rewriteContent);
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copiado!",
        description: "Currículo copiado para a área de transferência.",
      });
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o texto.",
        variant: "destructive",
      });
    }
  };

  const generatePlainText = (content: RewriteContent): string => {
    let text = `${content.headline}\n\n`;
    text += `RESUMO PROFISSIONAL\n${content.summary}\n\n`;
    text += `EXPERIÊNCIA PROFISSIONAL\n`;
    content.experience.forEach((exp) => {
      text += `${exp.role} | ${exp.company}\n${exp.date}\n`;
      exp.bullets.forEach((bullet) => {
        text += `• ${bullet}\n`;
      });
      text += `\n`;
    });
    text += `COMPETÊNCIAS\n${content.skills.join(" • ")}\n\n`;
    text += `FORMAÇÃO\n${content.education}`;
    return text;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-hero neural-pattern flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-foreground font-medium">Gerando seu currículo otimizado...</p>
        <p className="text-sm text-muted-foreground mt-2">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen gradient-hero neural-pattern flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Erro</h1>
        <p className="text-muted-foreground text-center mb-6 max-w-md">{error}</p>
        <Button variant="hero" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Início
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero neural-pattern">
      {/* Header */}
      <header className="container py-5">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img src={cvxLogo} alt="CVX" className="h-10 w-auto" />
        </div>
      </header>

      <main className="container pb-20">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-accent" />
            </div>
            <h1 className="text-3xl font-bold font-display text-foreground mb-2">
              Currículo Pronto!
            </h1>
            <p className="text-muted-foreground">
              Seu currículo foi reescrito e otimizado com sucesso.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Button variant="hero" className="flex-1" onClick={handleDownload}>
              <Download className="w-5 h-5" />
              Baixar {format === "docx" ? "Word" : "PDF"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleCopyAll}>
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? "Copiado!" : "Copiar Tudo"}
            </Button>
          </div>

          {/* Preview */}
          {rewriteContent && (
            <div className="p-6 rounded-2xl bg-card border border-border space-y-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                Preview do Currículo
              </div>

              {/* Headline */}
              <div>
                <p className="text-2xl font-bold text-foreground">{rewriteContent.headline}</p>
              </div>

              {/* Summary */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Resumo Profissional
                </h3>
                <p className="text-foreground">{rewriteContent.summary}</p>
              </div>

              {/* Experience */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Experiência Profissional
                </h3>
                <div className="space-y-4">
                  {rewriteContent.experience.map((exp, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-semibold text-foreground">{exp.role}</span>
                        <span className="text-sm text-muted-foreground">{exp.date}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{exp.company}</p>
                      <ul className="space-y-1">
                        {exp.bullets.map((bullet, bIndex) => (
                          <li key={bIndex} className="text-sm text-foreground flex gap-2">
                            <span className="text-primary">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Competências
                </h3>
                <div className="flex flex-wrap gap-2">
                  {rewriteContent.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-sm rounded-full bg-primary/10 text-primary border border-primary/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Formação
                </h3>
                <p className="text-foreground">{rewriteContent.education}</p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border">
            <h4 className="font-semibold text-foreground mb-2">Como usar:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {format === "pdf" ? (
                <>
                  <li>1. Clique em "Baixar PDF" para baixar o arquivo HTML</li>
                  <li>2. Abra o arquivo no navegador</li>
                  <li>3. Pressione Ctrl+P (ou Cmd+P no Mac) e salve como PDF</li>
                </>
              ) : (
                <>
                  <li>1. Clique em "Baixar Word" para baixar o arquivo HTML</li>
                  <li>2. Abra o arquivo no Microsoft Word</li>
                  <li>3. Salve como .docx (Arquivo → Salvar como → Word)</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CVDownload;
