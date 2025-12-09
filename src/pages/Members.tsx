import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  History, 
  Settings, 
  Calendar, 
  Filter,
  Mail,
  ArrowLeft,
  Save,
  Loader2,
  X,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCloudHistory, HistoryItem } from "@/lib/history";
import { AnalysisModal } from "@/components/AnalysisModal";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { MemberAnalysisForm } from "@/components/MemberAnalysisForm";
import { UpgradeSection } from "@/components/UpgradeSection";
import { MentorshipSection } from "@/components/MentorshipSection";
import { AnalysisLoading } from "@/components/AnalysisLoading";
import { AnalysisResult } from "@/lib/analysis";
import cvxLogo from "@/assets/cvx-logo.png";

interface ExtendedProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  full_name: string | null;
  birth_date: string | null;
  phone: string | null;
  linkedin_url: string | null;
}

interface SubscriptionInfo {
  subscribed: boolean;
  product_id: string | null;
  product_name: string | null;
  subscription_end: string | null;
  analyses_used: number;
  analyses_limit: number;
}

const Members = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [sortBy, setSortBy] = useState<"date" | "score">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    birth_date: "",
    phone: "",
    linkedin_url: "",
  });
  
  const [selectedResult, setSelectedResult] = useState<HistoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Subscription state
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    subscribed: false,
    product_id: null,
    product_name: null,
    subscription_end: null,
    analyses_used: 0,
    analyses_limit: 0,
  });
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  
  // Analysis state
  const [showAnalysisForm, setShowAnalysisForm] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isPremiumResult, setIsPremiumResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/members");
    }
  }, [authLoading, user, navigate]);

  // Load subscription info
  useEffect(() => {
    const loadSubscription = async () => {
      if (!user) return;
      setIsLoadingSubscription(true);
      try {
        const { data, error } = await supabase.functions.invoke("check-subscription");
        
        if (error) {
          console.error("Error loading subscription:", error);
          return;
        }
        
        if (data) {
          setSubscription({
            subscribed: data.subscribed || false,
            product_id: data.product_id || null,
            product_name: data.product_name || null,
            subscription_end: data.subscription_end || null,
            analyses_used: data.analyses_used || 0,
            analyses_limit: data.analyses_limit || 0,
          });
        }
      } catch (error) {
        console.error("Error loading subscription:", error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };
    
    if (user) {
      loadSubscription();
    }
  }, [user]);

  // Load history
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;
      setIsLoadingHistory(true);
      try {
        const data = await getCloudHistory(user.id);
        setHistory(data);
        setFilteredHistory(data);
      } catch (error) {
        console.error("Error loading history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    if (user) {
      loadHistory();
    }
  }, [user]);

  // Load profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setIsLoadingProfile(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          const extendedProfile = data as unknown as ExtendedProfile;
          setProfile(extendedProfile);
          setFormData({
            full_name: extendedProfile.full_name || "",
            birth_date: extendedProfile.birth_date || "",
            phone: extendedProfile.phone || "",
            linkedin_url: extendedProfile.linkedin_url || "",
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    if (user) {
      loadProfile();
    }
  }, [user]);

  // Sort and filter history
  useEffect(() => {
    let sorted = [...history];
    
    if (sortBy === "date") {
      sorted.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
    } else {
      sorted.sort((a, b) => {
        return sortOrder === "desc" ? b.score - a.score : a.score - b.score;
      });
    }
    
    setFilteredHistory(sorted);
  }, [history, sortBy, sortOrder]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name || null,
          birth_date: formData.birth_date || null,
          phone: formData.phone || null,
          linkedin_url: formData.linkedin_url || null,
        })
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas informações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSubscription = () => {
    const subject = encodeURIComponent("Cancelamento de Assinatura CVX");
    const body = encodeURIComponent(
      `Olá,\n\nGostaria de solicitar o cancelamento da minha assinatura.\n\nEmail da conta: ${user?.email}\n\nAtenciosamente.`
    );
    window.location.href = `mailto:contato@cxvapp.com?subject=${subject}&body=${body}`;
  };

  const handleViewResult = (item: HistoryItem) => {
    setSelectedResult(item);
    setIsModalOpen(true);
  };

  const handleAnalysisComplete = (result: AnalysisResult, isPremium: boolean) => {
    setAnalysisResult(result);
    setIsPremiumResult(isPremium);
    setIsAnalysisModalOpen(true);
    setShowAnalysisForm(false);
    
    // Reload history
    if (user) {
      getCloudHistory(user.id).then(data => {
        setHistory(data);
        setFilteredHistory(data);
      });
    }
  };

  const handleUsageIncremented = () => {
    setSubscription(prev => ({
      ...prev,
      analyses_used: prev.analyses_used + 1,
    }));
  };

  const handleGenerateAnalysis = () => {
    setShowAnalysisForm(true);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-accent";
    if (score >= 40) return "text-yellow-500";
    return "text-destructive";
  };

  const hasReachedLimit = subscription.analyses_limit < 999999 && 
    subscription.analyses_used >= subscription.analyses_limit;

  if (authLoading) {
    return (
      <div className="min-h-screen gradient-hero neural-pattern flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-hero neural-pattern">
      {/* Header */}
      <header className="container py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={cvxLogo} alt="CVX" className="h-10 w-auto" />
          </div>
        </div>
      </header>

      <main className="container pb-20">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-display text-foreground mb-2">
              Área do Membro
            </h1>
            <p className="text-muted-foreground">
              Gerencie sua conta e visualize seu histórico de análises
            </p>
          </div>

          {/* Subscription Card */}
          <div className="mb-8">
            {isLoadingSubscription ? (
              <div className="p-6 rounded-2xl bg-card border border-border flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <SubscriptionCard
                subscription={subscription}
                onGenerateAnalysis={handleGenerateAnalysis}
                isLoading={isAnalyzing}
              />
            )}
          </div>

          {/* Analysis Form */}
          {showAnalysisForm && (
            <div className="mb-8 animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Nova Análise</h3>
                    <p className="text-sm text-muted-foreground">
                      Preencha os dados para gerar sua análise
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowAnalysisForm(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <MemberAnalysisForm
                hasActiveSubscription={subscription.subscribed}
                hasReachedLimit={hasReachedLimit}
                onAnalysisComplete={handleAnalysisComplete}
                onUsageIncremented={handleUsageIncremented}
              />
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="history" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                Histórico
              </TabsTrigger>
              <TabsTrigger value="account" className="gap-2">
                <Settings className="w-4 h-4" />
                Minha Conta
              </TabsTrigger>
            </TabsList>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Ordenar por:</span>
                </div>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "score")}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Data</SelectItem>
                      <SelectItem value="score">Nota do Match</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Decrescente</SelectItem>
                      <SelectItem value="asc">Crescente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* History List */}
              {isLoadingHistory ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-12 px-6 rounded-2xl bg-card border border-border">
                  <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhuma análise encontrada
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Você ainda não realizou nenhuma análise de currículo.
                  </p>
                  <Button variant="hero" onClick={() => setShowAnalysisForm(true)}>
                    Fazer Primeira Análise
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => handleViewResult(item)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {item.jobTitle}
                            </h3>
                            {item.isPremium && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary font-medium">
                                Premium
                              </span>
                            )}
                          </div>
                          {item.company && (
                            <p className="text-sm text-muted-foreground truncate">
                              {item.company}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold font-display ${getScoreColor(item.score)}`}>
                            {item.score}%
                          </div>
                          <span className="text-xs text-muted-foreground">Match</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
              {/* Profile Form */}
              <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Informações Pessoais</h3>
                    <p className="text-sm text-muted-foreground">Gerencie seus dados de perfil</p>
                  </div>
                </div>

                {isLoadingProfile ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={user.email || ""}
                          disabled
                          className="bg-secondary/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Nome Completo</Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          placeholder="Seu nome completo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birth_date">Data de Nascimento</Label>
                        <Input
                          id="birth_date"
                          type="date"
                          value={formData.birth_date}
                          onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="linkedin_url">URL do LinkedIn</Label>
                        <Input
                          id="linkedin_url"
                          value={formData.linkedin_url}
                          onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                          placeholder="https://linkedin.com/in/seu-perfil"
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2">
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Salvar Alterações
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Subscription Management */}
              {subscription.subscribed && (
                <div className="p-6 rounded-2xl bg-card border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                      <X className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Gerenciar Assinatura</h3>
                      <p className="text-sm text-muted-foreground">Solicite o cancelamento da sua assinatura</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    Para cancelar sua assinatura, envie um email para nossa equipe de suporte. 
                    Processaremos sua solicitação em até 48 horas úteis.
                  </p>

                  <Button 
                    variant="outline" 
                    className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={handleCancelSubscription}
                  >
                    <Mail className="w-4 h-4" />
                    Solicitar Cancelamento
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Upgrade Section - show for all non-advanced users */}
          {subscription.subscribed && 
           subscription.product_id !== "prod_SoLNjxp9RQNJIo" && 
           subscription.product_id !== "prod_TY5ZiELFu8XH7y" && (
            <UpgradeSection currentProductId={subscription.product_id} />
          )}

          {/* Mentorship Section - show for all subscribed users */}
          {subscription.subscribed && (
            <MentorshipSection />
          )}
        </div>
      </main>

      {/* History Result Modal */}
      {selectedResult && (
        <AnalysisModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedResult(null);
          }}
          result={{
            score: selectedResult.score,
            summary: selectedResult.summary,
            strengths: selectedResult.strengths,
            weaknesses: selectedResult.weaknesses,
            improvements: selectedResult.improvements,
            missingKeywords: selectedResult.missingKeywords,
          }}
          isPremium={selectedResult.isPremium}
        />
      )}

      {/* New Analysis Result Modal */}
      <AnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => {
          setIsAnalysisModalOpen(false);
          setAnalysisResult(null);
        }}
        result={analysisResult}
        isPremium={isPremiumResult}
      />

      {/* Loading overlay */}
      {isAnalyzing && <AnalysisLoading />}
    </div>
  );
};

export default Members;
