import { useState } from "react";
import {
  FileText,
  Target,
  Lightbulb,
  Copy,
  Download,
  Check,
  RefreshCw,
  Briefcase,
  GraduationCap,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export interface ExperienceItem {
  company: string;
  role: string;
  date: string;
  bullets: string[];
}

export interface RewriteContent {
  headline: string;
  summary: string;
  experience: ExperienceItem[];
  skills: string[];
  education: string;
  ats_keywords_added: string[];
  notes: string[];
}

interface CVRewriteResultProps {
  content: RewriteContent;
  onNewRewrite: () => void;
}

export const CVRewriteResult = ({ content, onNewRewrite }: CVRewriteResultProps) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
      toast({
        title: "Copiado!",
        description: `${section} copiado para a área de transferência.`,
      });
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o texto.",
        variant: "destructive",
      });
    }
  };

  const generateFullText = () => {
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

  const copyAll = () => copyToClipboard(generateFullText(), "Currículo completo");

  const downloadAsTxt = () => {
    const text = generateFullText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "curriculo-otimizado.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Download iniciado!",
      description: "Seu currículo foi baixado como TXT.",
    });
  };

  const CopyButton = ({ text, section }: { text: string; section: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copyToClipboard(text, section)}
      className="gap-1"
    >
      {copiedSection === section ? (
        <Check className="w-4 h-4 text-accent" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
      Copiar
    </Button>
  );

  return (
    <div className="p-6 rounded-2xl bg-card border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
            <Check className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-display text-foreground">
              Currículo Reescrito
            </h3>
            <p className="text-sm text-muted-foreground">
              Otimizado para ATS e recrutadores
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onNewRewrite} className="gap-1">
            <RefreshCw className="w-4 h-4" />
            Nova Reescrita
          </Button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="hero" onClick={copyAll} className="gap-2">
          {copiedSection === "Currículo completo" ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          Copiar Tudo
        </Button>
        <Button variant="outline" onClick={downloadAsTxt} className="gap-2">
          <Download className="w-4 h-4" />
          Baixar TXT
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="full" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="full" className="gap-2">
            <FileText className="w-4 h-4" />
            Versão Final
          </TabsTrigger>
          <TabsTrigger value="bullets" className="gap-2">
            <Target className="w-4 h-4" />
            Bullets de Impacto
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-2">
            <Lightbulb className="w-4 h-4" />
            Skills e Keywords
          </TabsTrigger>
        </TabsList>

        {/* Full Version Tab */}
        <TabsContent value="full" className="space-y-6">
          {/* Headline */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Título Profissional
              </h4>
              <CopyButton text={content.headline} section="Título" />
            </div>
            <p className="text-xl font-bold text-foreground">{content.headline}</p>
          </div>

          {/* Summary */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Resumo Profissional
              </h4>
              <CopyButton text={content.summary} section="Resumo" />
            </div>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {content.summary}
            </p>
          </div>

          {/* Experience */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-primary" />
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Experiência Profissional
              </h4>
            </div>
            <div className="space-y-6">
              {content.experience.map((exp, index) => (
                <div key={index} className="pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{exp.role}</p>
                      <p className="text-sm text-muted-foreground">
                        {exp.company} • {exp.date}
                      </p>
                    </div>
                    <CopyButton
                      text={`${exp.role}\n${exp.company} | ${exp.date}\n${exp.bullets.map((b) => `• ${b}`).join("\n")}`}
                      section={`${exp.company}`}
                    />
                  </div>
                  <ul className="space-y-1.5 mt-3">
                    {exp.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-primary mt-1">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-accent" />
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Competências
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {content.skills.map((skill, index) => (
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
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Formação
              </h4>
            </div>
            <p className="text-foreground">{content.education}</p>
          </div>
        </TabsContent>

        {/* Bullets Tab */}
        <TabsContent value="bullets" className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Bullets de alto impacto prontos para copiar e colar:
          </p>
          {content.experience.map((exp, index) => (
            <div key={index} className="p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">{exp.role}</p>
                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                </div>
                <CopyButton
                  text={exp.bullets.map((b) => `• ${b}`).join("\n")}
                  section={`Bullets ${exp.company}`}
                />
              </div>
              <ul className="space-y-2">
                {exp.bullets.map((bullet, bulletIndex) => (
                  <li
                    key={bulletIndex}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary transition-colors group cursor-pointer"
                    onClick={() => copyToClipboard(bullet, `Bullet ${bulletIndex}`)}
                  >
                    <span className="text-accent font-bold">•</span>
                    <span className="text-foreground flex-1">{bullet}</span>
                    <Copy className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4">
          {/* Skills */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-foreground">Competências Principais</h4>
              <CopyButton text={content.skills.join(", ")} section="Competências" />
            </div>
            <div className="flex flex-wrap gap-2">
              {content.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 text-sm rounded-lg bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => copyToClipboard(skill, skill)}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* ATS Keywords */}
          <div className="p-4 rounded-xl bg-accent/10 border border-accent/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                <h4 className="font-semibold text-foreground">Keywords ATS Adicionadas</h4>
              </div>
              <CopyButton
                text={content.ats_keywords_added.join(", ")}
                section="Keywords ATS"
              />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Palavras-chave otimizadas para sistemas de rastreamento:
            </p>
            <div className="flex flex-wrap gap-2">
              {content.ats_keywords_added.map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 text-sm rounded-lg bg-accent/20 text-accent-foreground border border-accent/30"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          {content.notes && content.notes.length > 0 && (
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <h4 className="font-semibold text-foreground">Sugestões de Melhoria</h4>
              </div>
              <ul className="space-y-2">
                {content.notes.map((note, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-yellow-500">💡</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
