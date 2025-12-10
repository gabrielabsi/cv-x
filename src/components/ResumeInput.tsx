import { useState, useRef, useEffect } from "react";
import { Upload, Linkedin, FileText, X, ExternalLink, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface LinkedInProfile {
  name: string;
  headline?: string;
  profileUrl?: string;
  pictureUrl?: string;
  resumeText: string;
}

interface ResumeInputProps {
  onFileChange: (file: File | null) => void;
  onLinkedInChange: (url: string) => void;
  onLinkedInProfileData?: (profileData: string) => void;
  linkedInUrl: string;
  selectedFile: File | null;
  isLoading?: boolean;
}

export function ResumeInput({ 
  onFileChange, 
  onLinkedInChange,
  onLinkedInProfileData,
  linkedInUrl, 
  selectedFile,
  isLoading 
}: ResumeInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState<"file" | "linkedin">("file");
  const [linkedInProfile, setLinkedInProfile] = useState<LinkedInProfile | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, session } = useAuth();

  // Check for LinkedIn profile on mount if user is logged in
  useEffect(() => {
    if (user && session) {
      checkLinkedInConnection();
    }
  }, [user, session]);

  const checkLinkedInConnection = async () => {
    if (!user) return;
    
    const linkedInIdentity = user.identities?.find(
      (identity) => identity.provider === "linkedin_oidc"
    );
    
    if (linkedInIdentity) {
      fetchLinkedInProfile();
    }
  };

  const fetchLinkedInProfile = async () => {
    setIsFetchingProfile(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-linkedin-profile");
      
      if (error) {
        console.error("Error fetching LinkedIn profile:", error);
        return;
      }
      
      if (data && !data.error) {
        setLinkedInProfile(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const connectLinkedIn = async () => {
    setIsConnecting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "linkedin_oidc",
        options: {
          redirectTo: `${window.location.origin}${window.location.pathname}`,
          scopes: "openid profile email",
        },
      });
      
      if (error) {
        toast.error("Erro ao conectar com LinkedIn");
        console.error("LinkedIn OAuth error:", error);
      }
    } catch (error) {
      toast.error("Erro ao iniciar conexão com LinkedIn");
      console.error("Error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const useLinkedInProfile = () => {
    if (linkedInProfile) {
      onLinkedInProfileData?.(linkedInProfile.resumeText);
      onLinkedInChange(linkedInProfile.profileUrl || "");
      toast.success("Perfil do LinkedIn carregado!");
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
          {/* LinkedIn Connection Section */}
          {user ? (
            <div className="rounded-xl border border-border bg-secondary/30 p-6">
              {isFetchingProfile ? (
                <div className="flex items-center justify-center gap-3 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">Carregando perfil...</span>
                </div>
              ) : linkedInProfile ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {linkedInProfile.pictureUrl ? (
                      <img 
                        src={linkedInProfile.pictureUrl} 
                        alt={linkedInProfile.name}
                        className="w-14 h-14 rounded-full border-2 border-accent/30"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                        <Linkedin className="w-7 h-7 text-primary" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{linkedInProfile.name}</h4>
                        <Check className="w-4 h-4 text-accent" />
                      </div>
                      {linkedInProfile.headline && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {linkedInProfile.headline}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={useLinkedInProfile}
                    disabled={isLoading}
                    className="w-full gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Usar este perfil para análise
                  </Button>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-[#0077B5]/20 flex items-center justify-center">
                    <Linkedin className="w-7 h-7 text-[#0077B5]" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Conectar LinkedIn</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Conecte sua conta para buscar seus dados automaticamente
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={connectLinkedIn}
                    disabled={isConnecting || isLoading}
                    className="w-full gap-2 bg-[#0077B5] hover:bg-[#006699]"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Linkedin className="w-4 h-4" />
                    )}
                    {isConnecting ? "Conectando..." : "Conectar com LinkedIn"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-secondary/30 p-6 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-xl bg-[#0077B5]/20 flex items-center justify-center">
                <Linkedin className="w-7 h-7 text-[#0077B5]" />
              </div>
              <p className="text-sm text-muted-foreground">
                Faça login para conectar seu LinkedIn
              </p>
            </div>
          )}

          {/* PDF Export Instructions */}
          <div className="rounded-xl border border-dashed border-border bg-background/50 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">
                  Para análise mais completa
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Exporte seu perfil do LinkedIn como PDF com experiências e habilidades detalhadas.
                </p>
                <a 
                  href="https://www.linkedin.com/help/linkedin/answer/4281/export-your-linkedin-profile-to-pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  Como exportar PDF do LinkedIn
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
