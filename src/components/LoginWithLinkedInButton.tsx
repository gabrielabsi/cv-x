import { useState } from "react";
import { supabaseAuth } from "@/integrations/supabase/authClient";
import { Loader2, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginWithLinkedInButton() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { data, error } = await supabaseAuth.auth.signInWithOAuth({
        provider: "linkedin_oidc",
        options: {
          redirectTo,
          scopes: "openid profile email",
        },
      });

      if (error) {
        console.error("Erro ao iniciar login com LinkedIn:", error);
        alert("Não foi possível iniciar o login com o LinkedIn.");
        setLoading(false);
        return;
      }

      console.log("Redirecionando para LinkedIn OAuth…", data);
    } catch (err) {
      console.error("Erro inesperado ao iniciar login com LinkedIn:", err);
      alert("Erro inesperado ao tentar autenticar com o LinkedIn.");
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full flex items-center justify-center gap-2"
      onClick={handleLogin}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Conectando ao LinkedIn…
        </>
      ) : (
        <>
          Entrar com LinkedIn
        </>
      )}
    </Button>
  );
}
