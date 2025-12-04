import { useState, useRef } from "react";
import { Upload, Link, FileText, X, Loader2 } from "lucide-react";
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
        >
          <Upload className="w-4 h-4 mr-2" />
          Arquivo
        </Button>
        <Button
          type="button"
          variant={inputMode === "linkedin" ? "default" : "outline"}
          size="sm"
          onClick={() => setInputMode("linkedin")}
          disabled={isLoading}
        >
          <Link className="w-4 h-4 mr-2" />
          LinkedIn
        </Button>
      </div>

      {inputMode === "file" ? (
        <div
          className={cn(
            "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50",
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
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div className="text-left">
                <p className="font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
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
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">
                  Arraste seu currículo aqui
                </p>
                <p className="text-sm text-muted-foreground">
                  ou clique para selecionar (PDF ou DOCX)
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="linkedin" className="text-foreground">URL do LinkedIn</Label>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="linkedin"
              type="url"
              placeholder="https://linkedin.com/in/seu-perfil"
              value={linkedInUrl}
              onChange={(e) => onLinkedInChange(e.target.value)}
              className="pl-10"
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
