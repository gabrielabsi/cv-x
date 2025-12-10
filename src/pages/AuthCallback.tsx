import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAuth } from '@/integrations/supabase/authClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const finishLogin = async () => {
      try {
        const returnTo = searchParams.get('returnTo') || '/';
        
        // Try LinkedIn OAuth callback first (external auth client)
        const linkedInResult = await supabaseAuth.auth.exchangeCodeForSession(
          window.location.href
        );

        if (linkedInResult.data?.session) {
          // LinkedIn login successful - store profile data in localStorage
          const user = linkedInResult.data.session.user;
          const linkedInProfile = {
            name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            email: user.email || '',
            avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
          };
          localStorage.setItem('cvx_linkedin_profile', JSON.stringify(linkedInProfile));
          console.log('LinkedIn profile stored:', linkedInProfile);
          navigate(returnTo, { replace: true });
          return;
        }

        // If LinkedIn failed, try main Supabase auth (email/password OAuth)
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error('Erro ao finalizar OAuth:', error);
          navigate('/auth?error=oauth', { replace: true });
          return;
        }

        console.log('Sessão criada:', data.session);
        navigate(returnTo, { replace: true });
      } catch (err) {
        console.error('Erro inesperado no callback:', err);
        navigate('/auth?error=unexpected', { replace: true });
      }
    };

    finishLogin();
  }, [navigate, searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-foreground">Finalizando autenticação...</p>
    </main>
  );
}
