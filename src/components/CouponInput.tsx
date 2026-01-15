import { useState } from "react";
import { Tag, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CouponInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CouponInput({ value, onChange, disabled }: CouponInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const handleApply = () => {
    onChange(inputValue.trim().toUpperCase());
    if (inputValue.trim()) {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setInputValue("");
    onChange("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  if (value && !isOpen) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
        <Tag className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-primary flex-1">{value}</span>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="p-1 rounded hover:bg-primary/20 transition-colors"
          aria-label="Remover cupom"
        >
          <X className="w-4 h-4 text-primary" />
        </button>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <Tag className="w-4 h-4" />
        <span>Adicionar cupom de desconto</span>
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        type="text"
        placeholder="Digite o código do cupom"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value.toUpperCase())}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="flex-1 uppercase"
        autoFocus
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleApply}
        disabled={disabled || !inputValue.trim()}
      >
        <Check className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => {
          setIsOpen(false);
          setInputValue(value);
        }}
        disabled={disabled}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
