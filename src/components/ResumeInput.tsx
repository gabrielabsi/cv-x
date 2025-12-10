import { useState, useRef } from "react";
import { Upload, Linkedin, FileText, X, ExternalLink, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabaseAuth } from "@/integrations/supabase/authClient";

interface ResumeInputProps {
  onFileChange: (file: File | null) => void;
  onLinkedInChange: (url: string) => void;
  onLinkedInProfileData?: (profileData: string) => void;
  linkedInUrl: string;
  selectedFile: File | null;
  isLoading?: boolean;
  linkedInProfile?: {
    name: string;
    email: string;
    avatarUrl?: string;
  } | null;
}

export function ResumeInput({ 
  onFileChange, 
  onLinkedInChange,
  linkedInUrl, 
  selectedFile,
  isLoading,
  linkedInProfile
}: ResumeInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState<"file" | "linkedin">("file");
  const [isConnectingLinkedIn, setIsConnectingLinkedIn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLinkedInLogin = async () => {
    try {
      setIsConnectingLinkedIn(true);
      const redirectTo = `${window.location.origin}/auth/callback?returnTo=/`;
      
      const { error } = await supabaseAuth.auth.signInWithOAuth({
        provider: "linkedin_oidc",
        options: {
          redirectTo,
          scopes: "openid profile email",
        },
      });

      if (error) {
        console.error("Erro ao conectar com LinkedIn:", error);
        alert("Não foi possível conectar com o LinkedIn.");
        setIsConnectingLinkedIn(false);
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
      alert("Erro inesperado ao tentar conectar com o LinkedIn.");
      setIsConnectingLinkedIn(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "application/pdf" || file.name.endsWith(".docx"))) {
      onFileChange(file);
      setInputMode("file");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileChange(file);
    }
  };

  const clearFile = () => {
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const switchToFileUpload = () => {
    setInputMode("file");
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={inputMode === "file" ? "default" : "outline"}
          size="sm"
          onClick={() => setInputMode("file")}
          disabled={isLoading}
          className="gap-2"
        >
          <Upload className="w-4 h-4" />
          Arquivo
        </Button>
        <Button
          type="button"
          variant={inputMode === "linkedin" ? "default" : "outline"}
          size="sm"
          onClick={() => setInputMode("linkedin")}
          disabled={isLoading}
          className="gap-2"
        >
          <Linkedin className="w-4 h-4" />
          LinkedIn
        </Button>
      </div>

      {inputMode === "file" ? (
        <div
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300",
            isDragging 
              ? "border-primary bg-primary/10 shadow-glow-sm" 
              : "border-border hover:border-primary/50 hover:bg-secondary/50",
            selectedFile && "border-accent/50 bg-accent/5",
            isLoading && "opacity-50 pointer-events-none"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isLoading}
          />
          
          {selectedFile ? (
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Pronto para análise
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                disabled={isLoading}
                className="ml-auto hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-14 h-14 mx-auto rounded-xl bg-secondary flex items-center justify-center">
                <Upload className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Arraste seu currículo aqui
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ou clique para selecionar • PDF ou DOCX
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-secondary/30 p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#0077B5]/20 flex items-center justify-center shrink-0">
                <Linkedin className="w-7 h-7 text-[#0077B5]" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Usar perfil do LinkedIn</h4>
                <p className="text-sm text-muted-foreground">
                  Conecte sua conta para importar seus dados automaticamente
                </p>
              </div>
            </div>

            {linkedInProfile ? (
              <div className="bg-[#0077B5]/10 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {linkedInProfile.avatarUrl ? (
                    <img 
                      src={linkedInProfile.avatarUrl} 
                      alt={linkedInProfile.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#0077B5]/30 flex items-center justify-center">
                      <User className="w-6 h-6 text-[#0077B5]" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{linkedInProfile.name}</p>
                    <p className="text-sm text-muted-foreground">{linkedInProfile.email}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0077B5] bg-[#0077B5]/20 px-2 py-1 rounded-full">
                      <Linkedin className="w-3 h-3" />
                      Conectado
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground/80">
                    ✓ Perfil do LinkedIn vinculado e pronto para análise
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      localStorage.removeItem('cvx_linkedin_profile');
                      window.location.reload();
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Desconectar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    onClick={handleLinkedInLogin}
                    disabled={isLoading || isConnectingLinkedIn}
                    className="w-full gap-2 bg-[#0077B5] hover:bg-[#006097] text-white"
                  >
                    {isConnectingLinkedIn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <Linkedin className="w-4 h-4" />
                        Conectar com LinkedIn
                      </>
                    )}
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">ou</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={switchToFileUpload}
                    disabled={isLoading}
                    className="w-full gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Fazer upload do PDF do LinkedIn
                  </Button>
                </div>

                <div className="bg-background/50 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Para exportar o PDF manualmente:</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Acesse seu perfil no LinkedIn</li>
                    <li>Clique em "Mais" → "Salvar como PDF"</li>
                  </ol>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
