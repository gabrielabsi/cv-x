import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import cvxLogo from "@/assets/cvx-logo.png";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const signUpSchema = loginSchema.extend({
  displayName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signIn, signUp, user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast({
          title: "Erro ao entrar com Google",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Erro ao iniciar login com Google:", err);
      toast({
        title: "Erro inesperado",
        description: "Não foi possível conectar com o Google.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "login") {
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          toast({
            title: "Dados inválidos",
            description: validation.error.errors[0].message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          let message = error.message;
          if (message.includes("Invalid login credentials")) {
            message = "Email ou senha incorretos";
          }
          toast({
            title: "Erro ao entrar",
            description: message,
            variant: "destructive",
          });
        }
      } else if (mode === "signup") {
        const validation = signUpSchema.safeParse({ email, password, displayName });
        if (!validation.success) {
          toast({
            title: "Dados inválidos",
            description: validation.error.errors[0].message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, displayName);
        if (error) {
          let message = error.message;
          if (message.includes("already registered")) {
            message = "Este email já está cadastrado";
          }
          toast({
            title: "Erro ao criar conta",
            description: message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Conta criada!",
            description: "Você já pode começar a usar.",
          });
        }
      } else if (mode === "reset") {
        const emailValidation = z.string().email("Email inválido").safeParse(email);
        if (!emailValidation.success) {
          toast({
            title: "Dados inválidos",
            description: "Por favor, insira um email válido.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });

        if (error) {
          toast({
            title: "Erro ao enviar email",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Email enviado!",
            description: "Verifique sua caixa de entrada para redefinir sua senha.",
          });
          setMode("login");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-up">
        {/* Logo CVX centralizado */}
        <a href="/" className="flex justify-center mb-8">
          <img src={cvxLogo} alt="CV-X Logo" className="h-20 w-auto" />
        </a>

        <div className="p-8 rounded-2xl bg-card border border-border shadow-card">
          {mode === "reset" && (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </button>
          )}
          
          <h1 className="text-2xl font-bold text-center text-foreground mb-2">
            {mode === "login" && "Bem-vindo de volta!"}
            {mode === "signup" && "Crie sua conta"}
            {mode === "reset" && "Recuperar senha"}
          </h1>
          <p className="text-center text-muted-foreground mb-6">
            {mode === "login" && "Entre para acessar seu histórico"}
            {mode === "signup" && "Salve suas análises na nuvem"}
            {mode === "reset" && "Enviaremos um link para redefinir sua senha"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Seu nome"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {mode !== "reset" && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {mode === "login" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode("reset")}
                  className="text-sm text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="hero"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === "login" && "Entrando..."}
                  {mode === "signup" && "Criando conta..."}
                  {mode === "reset" && "Enviando..."}
                </>
              ) : (
                <>
                  {mode === "login" && "Entrar"}
                  {mode === "signup" && "Criar conta"}
                  {mode === "reset" && "Enviar link de recuperação"}
                </>
              )}
          </Button>
          </form>

          {mode !== "reset" && (
            <>
              <div className="flex items-center gap-2 my-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Entrar com Google
                  </>
                )}
              </Button>
            </>
          )}


          {mode !== "reset" && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-sm text-primary hover:underline"
              >
                {mode === "login"
                  ? "Não tem conta? Criar agora"
                  : "Já tem conta? Entrar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
