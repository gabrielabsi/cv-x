import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Linkedin } from 'lucide-react';

export function LoginWithLinkedInButton() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo,
          scopes: 'openid profile email',
        },
      });

      if (error) {
        console.error('Erro ao iniciar login com LinkedIn:', error);
        alert('Não foi possível iniciar o login com o LinkedIn.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error(err);
      alert('Erro inesperado ao tentar autenticar com o LinkedIn.');
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleLogin}
      disabled={loading}
      variant="outline"
      className="w-full flex items-center justify-center gap-2"
    >
      <Linkedin className="h-4 w-4" />
      {loading ? 'Redirecionando…' : 'Entrar com LinkedIn'}
    </Button>
  );
}
