import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const finishLogin = async () => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href,
        );

        if (error) {
          console.error('Erro ao finalizar OAuth:', error);
          navigate('/auth?error=oauth', { replace: true });
          return;
        }

        console.log('Sessão criada:', data.session);
        navigate('/', { replace: true });
      } catch (err) {
        console.error('Erro inesperado no callback:', err);
        navigate('/auth?error=unexpected', { replace: true });
      }
    };

    finishLogin();
  }, [navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-foreground">Finalizando autenticação com o LinkedIn…</p>
    </main>
  );
}
