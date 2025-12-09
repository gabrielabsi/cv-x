import { useState } from "react";
import { Users, Clock, Award, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import marcelaPhoto from "@/assets/marcela-absi.jpeg";

export function MentorshipSection() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePurchase = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { productType: "mentoria" }
      });

      if (error) throw error;
      if (!data?.url) throw new Error("Falha ao criar sessão de pagamento");

      window.open(data.url, "_blank");
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-16 relative">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
          <Users className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-accent">Mentoria Exclusiva</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
          Mentoria com Especialista em Carreira
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Acelere sua transição de carreira com orientação personalizada de uma especialista.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="p-8 rounded-2xl bg-card border border-border shadow-card-premium relative overflow-hidden">
          {/* Background accent */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 pointer-events-none" />
          
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            {/* Photo & Basic Info */}
            <div className="text-center md:text-left">
              <div className="relative inline-block mb-6">
                <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-accent/30 shadow-lg mx-auto md:mx-0">
                  <img 
                    src={marcelaPhoto} 
                    alt="Marcela Absi - Mentora de Carreira" 
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-lg">
                  <Award className="w-5 h-5 text-accent-foreground" />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold font-display text-foreground mb-2">Marcela Absi</h3>
              <p className="text-accent font-medium mb-4">Psicóloga & Mentora de Carreira</p>
              
              <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>1 hora</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>Online</span>
                </div>
              </div>
            </div>

            {/* About & CTA */}
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-4">Sobre Marcela Absi</h4>
              <div className="space-y-4 text-muted-foreground mb-6">
                <p>
                  Sou psicóloga com mais de 10 anos de experiência em gestão de pessoas e desenvolvimento profissional.
                </p>
                <p>
                  Tenho vivência também como empreendedora no varejo, o que me proporcionou uma visão prática do mercado.
                </p>
                <p>
                  Eu passei por isso. Sei o que é sentir que perdeu sua identidade profissional depois da maternidade. Sei o que é ter medo de recomeçar. E sei também que é possível se reencontrar.
                </p>
                <p>
                  Hoje utilizo esse conhecimento e vivência para orientar profissionais na construção de carreiras mais alinhadas com seus propósitos e objetivos.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/50 border border-border mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Mentoria Individual</p>
                    <div className="flex items-center gap-3">
                      <p className="text-lg text-muted-foreground line-through decoration-destructive decoration-2">R$ 399</p>
                      <p className="text-2xl font-bold font-display text-foreground">R$ 199</p>
                    </div>
                    <p className="text-xs text-accent font-medium mt-1">🚀 Promoção de Lançamento - Por tempo limitado!</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Sessão de 1 hora</p>
                    <p>Via videochamada</p>
                  </div>
                </div>
              </div>

              <Button
                variant="hero"
                className="w-full group"
                onClick={handlePurchase}
                disabled={isLoading}
              >
                {isLoading ? "Aguarde..." : "Agendar Mentoria"}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
