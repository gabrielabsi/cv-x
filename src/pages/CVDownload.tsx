import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  Download, 
  FileText, 
  Loader2, 
  Check,
  Copy,
  ArrowLeft,
  AlertTriangle,
  Printer
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
  certifications?: string[];
  languages?: string[];
}

// Product IDs for subscription plans that include CV rewrites
const SUBSCRIBER_PRODUCTS = [
  "prod_SoLNLB46DyQGr1", // CVX Intermediário (old)
  "prod_SoLNjxp9RQNJIo", // CVX Avançado (old)
  "prod_TY5ZXRFPInS0UH", // CVX Intermediário
  "prod_TY5ZiELFu8XH7y", // CVX Avançado
];

const CVDownload = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rewriteContent, setRewriteContent] = useState<RewriteContent | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [format, setFormat] = useState<string>("pdf");
  const [copied, setCopied] = useState(false);
  const [isSubscriber, setIsSubscriber] = useState(false);
  

  const sessionId = searchParams.get("session_id");
  const formatParam = searchParams.get("format");

  useEffect(() => {
    if (formatParam) setFormat(formatParam);
  }, [formatParam]);

  // Check if user is a subscriber with CV rewrite access
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data } = await supabase.functions.invoke("check-subscription");
        if (data?.subscribed && data?.product_id && SUBSCRIBER_PRODUCTS.includes(data.product_id)) {
          setIsSubscriber(true);
        }
      } catch (err) {
        console.error("Error checking subscription:", err);
      }
    };
    checkSubscription();
  }, []);

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
          throw new Error(data?.error || "Erro ao gerar documento");
        }

        // Validate the rewrite content
        const rewrite = data.rewrite;
        if (!rewrite.headline || !rewrite.summary || !rewrite.experience || rewrite.experience.length === 0) {
          throw new Error("Currículo gerado está incompleto. Por favor, tente novamente.");
        }

        setRewriteContent(rewrite);
        setHtmlContent(data.html);
        
        // Clear sessionStorage
        sessionStorage.removeItem("cvx_rewrite_resume");

      } catch (err) {
        console.error("Generate document error:", err);
        setError(err instanceof Error ? err.message : "Erro ao gerar documento");
      } finally {
        setIsLoading(false);
      }
    };

    generateDocument();
  }, [sessionId, format]);

  const handleDownloadPdf = () => {
    if (!htmlContent || !rewriteContent) return;

    // Open print dialog - user can save as PDF from browser's print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      // Enhanced HTML with print-optimized styles
      const printHtml = htmlContent.replace('</head>', `
        <style>
          @media print {
            @page { 
              size: A4; 
              margin: 15mm; 
            }
            body { 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              margin: 0;
              padding: 0;
            }
            .footer { display: none !important; }
          }
        </style>
      </head>`);
      
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load before printing
      setTimeout(() => {
        printWindow.print();
        toast({
          title: "Janela de impressão aberta",
          description: "Escolha 'Salvar como PDF' na opção de impressora para baixar o arquivo.",
        });
      }, 300);
    } else {
      toast({
        title: "Erro ao abrir janela",
        description: "Verifique se o bloqueador de pop-ups está desativado.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadHtml = (downloadFormat: string) => {
    if (!htmlContent) return;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `curriculo-otimizado.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download iniciado!",
      description: downloadFormat === "docx" 
        ? "Abra o arquivo HTML no Word e salve como .docx"
        : "Abra o arquivo HTML no navegador e use Ctrl+P para salvar como PDF",
    });
  };

  const handlePrint = () => {
    if (!htmlContent) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
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
    
    if (content.certifications && content.certifications.length > 0) {
      text += `\n\nCERTIFICAÇÕES\n${content.certifications.join("\n")}`;
    }
    
    if (content.languages && content.languages.length > 0) {
      text += `\n\nIDIOMAS\n${content.languages.join("\n")}`;
    }
    
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
              Seu currículo foi reescrito e otimizado para ATS com sucesso.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            {isSubscriber ? (
              <>
                <Button 
                  variant="hero" 
                  className="flex-1" 
                  onClick={handleDownloadPdf}
                >
                  <Download className="w-5 h-5" />
                  Baixar PDF
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => handleDownloadHtml("docx")}>
                  <FileText className="w-5 h-5" />
                  Baixar Word
                </Button>
              </>
            ) : (
              <Button 
                variant="hero" 
                className="flex-1" 
                onClick={format === "pdf" ? handleDownloadPdf : () => handleDownloadHtml("docx")}
              >
                <Download className="w-5 h-5" />
                {`Baixar ${format === "docx" ? "Word" : "PDF"}`}
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={handleCopyAll}>
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? "Copiado!" : "Copiar Tudo"}
            </Button>
          </div>

          {/* Secondary Actions */}
          <div className="flex justify-center gap-3 mb-8">
            <Button variant="ghost" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir / Salvar como PDF
            </Button>
          </div>

          {/* Preview */}
          {rewriteContent && (
            <div ref={printRef} className="p-6 rounded-2xl bg-card border border-border space-y-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                Preview do Currículo ({rewriteContent.experience.length} experiência(s))
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
                <p className="text-foreground whitespace-pre-wrap">{rewriteContent.summary}</p>
              </div>

              {/* Experience */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Experiência Profissional
                </h3>
                <div className="space-y-4">
                  {rewriteContent.experience.map((exp, index) => (
                    <div key={index} className="pb-4 border-b border-border last:border-0 last:pb-0">
                      <div className="flex justify-between items-baseline mb-1 flex-wrap gap-2">
                        <span className="font-semibold text-foreground">{exp.role}</span>
                        <span className="text-sm text-muted-foreground">{exp.date}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{exp.company}</p>
                      <ul className="space-y-1">
                        {exp.bullets.map((bullet, bIndex) => (
                          <li key={bIndex} className="text-sm text-foreground flex gap-2">
                            <span className="text-primary flex-shrink-0">•</span>
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

              {/* Certifications */}
              {rewriteContent.certifications && rewriteContent.certifications.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Certificações
                  </h3>
                  <ul className="space-y-1">
                    {rewriteContent.certifications.map((cert, index) => (
                      <li key={index} className="text-sm text-foreground flex gap-2">
                        <span className="text-accent flex-shrink-0">✓</span>
                        <span>{cert}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Languages */}
              {rewriteContent.languages && rewriteContent.languages.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Idiomas
                  </h3>
                  <ul className="space-y-1">
                    {rewriteContent.languages.map((lang, index) => (
                      <li key={index} className="text-sm text-foreground">{lang}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border">
            <h4 className="font-semibold text-foreground mb-2">Dicas:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>PDF direto:</strong> Use o botão "Baixar PDF" para gerar automaticamente</li>
              <li>• <strong>Alternativa:</strong> Clique em "Imprimir" e escolha "Salvar como PDF"</li>
              {(isSubscriber || format === "docx") && (
                <li>• <strong>Word:</strong> Baixe o HTML e abra no Microsoft Word para editar</li>
              )}
              <li>• <strong>Copiar:</strong> Use "Copiar Tudo" para colar em qualquer editor</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CVDownload;
