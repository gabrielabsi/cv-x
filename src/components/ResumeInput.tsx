import { useState, useRef } from "react";
import { Upload, Link, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ResumeInputProps {
  onFileChange: (file: File | null) => void;
  onLinkedInChange: (url: string) => void;
  linkedInUrl: string;
  selectedFile: File | null;
  isLoading?: boolean;
}

export function ResumeInput({ 
  onFileChange, 
  onLinkedInChange, 
  linkedInUrl, 
  selectedFile,
  isLoading 
}: ResumeInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState<"file" | "linkedin">("file");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          <Link className="w-4 h-4" />
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
        <div className="space-y-3">
          <Label htmlFor="linkedin" className="text-foreground font-medium">URL do LinkedIn</Label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
              <Link className="w-3 h-3 text-primary" />
            </div>
            <Input
              id="linkedin"
              type="url"
              placeholder="https://linkedin.com/in/seu-perfil"
              value={linkedInUrl}
              onChange={(e) => onLinkedInChange(e.target.value)}
              className="pl-12 h-12 bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 transition-all"
              disabled={isLoading}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Cole a URL completa do seu perfil LinkedIn
          </p>
        </div>
      )}
    </div>
  );
}
