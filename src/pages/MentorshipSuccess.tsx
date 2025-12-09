import { CheckCircle, Calendar, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import cvxLogo from "@/assets/cvx-logo.png";
import marcelaPhoto from "@/assets/marcela-absi.jpeg";

const MentorshipSuccess = () => {
  const whatsappLink = "https://wa.me/5531986374811";

  return (
    <div className="min-h-screen gradient-hero neural-pattern flex flex-col">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px] animate-glow-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/6 rounded-full blur-[120px] animate-glow-pulse delay-300" />
      </div>

      {/* Header */}
      <header className="relative container py-5">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={cvxLogo} 
              alt="CVX" 
              className="h-14 w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative container flex-1 flex items-center justify-center py-10">
        <div className="max-w-lg w-full">
          <div className="p-8 md:p-10 rounded-2xl bg-card border border-border shadow-card-premium relative overflow-hidden text-center">
            {/* Card glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            
            <div className="relative space-y-6">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center animate-fade-up">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2 animate-fade-up delay-100">
                <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
                  Mentoria Confirmada!
                </h1>
                <p className="text-muted-foreground">
                  Sua sessão de mentoria com Marcela Absi foi adquirida com sucesso.
                </p>
              </div>

              {/* Mentor Info */}
              <div className="flex items-center justify-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border animate-fade-up delay-200">
                <img 
                  src={marcelaPhoto} 
                  alt="Marcela Absi" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-primary/30"
                />
                <div className="text-left">
                  <p className="font-semibold text-foreground">Marcela Absi</p>
                  <p className="text-sm text-muted-foreground">Especialista em Carreira</p>
                  <p className="text-sm text-accent">Mentoria de 1 hora</p>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-3 text-left animate-fade-up delay-300">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Próximos passos
                </h2>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">1</span>
                    Clique no botão abaixo para entrar em contato com Marcela
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">2</span>
                    Informe que você adquiriu a mentoria pelo CV-X
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">3</span>
                    Agende o melhor horário para sua sessão
                  </li>
                </ol>
              </div>

              {/* WhatsApp Button */}
              <Button
                variant="hero"
                className="w-full group animate-fade-up delay-400"
                asChild
              >
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5" />
                  Agende sua Mentoria
                </a>
              </Button>

              {/* Back Link */}
              <Link 
                to="/members" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors animate-fade-up delay-500 block"
              >
                Voltar para área de membros
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MentorshipSuccess;
