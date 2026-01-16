import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
          <Globe className="h-4 w-4" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border min-w-[120px]">
        <DropdownMenuItem
          onClick={() => setLanguage("pt")}
          className={`cursor-pointer ${language === "pt" ? "bg-primary/10 text-primary" : ""}`}
        >
          🇧🇷 Português
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage("en")}
          className={`cursor-pointer ${language === "en" ? "bg-primary/10 text-primary" : ""}`}
        >
          🇺🇸 English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
