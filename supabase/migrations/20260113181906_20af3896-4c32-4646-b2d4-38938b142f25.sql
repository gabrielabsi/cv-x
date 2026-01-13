-- =====================================================
-- HARDENING DE SEGURANÇA: rate_limits e profiles
-- =====================================================

-- =====================================================
-- 1. RATE_LIMITS - Defesa em Profundidade
-- =====================================================
-- A tabela rate_limits já tem RLS ENABLED e policy "USING (false)"
-- Vamos adicionar políticas RESTRICTIVE explícitas por operação
-- e revogar privilégios públicos para defesa em profundidade

-- Revogar privilégios públicos da tabela rate_limits
-- Isso garante que mesmo sem RLS, usuários anon/authenticated não teriam acesso
REVOKE ALL ON public.rate_limits FROM anon, authenticated;

-- Políticas RESTRICTIVE adicionais por operação (defesa em profundidade)
-- Mesmo que alguém adicione uma policy permissiva futura, estas bloqueiam

CREATE POLICY "rate_limits_no_select"
ON public.rate_limits
AS RESTRICTIVE
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "rate_limits_no_insert"
ON public.rate_limits
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "rate_limits_no_update"
ON public.rate_limits
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false);

CREATE POLICY "rate_limits_no_delete"
ON public.rate_limits
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);

-- Comentário documentando a tabela
COMMENT ON TABLE public.rate_limits IS 'Tabela de rate limiting. Acesso BLOQUEADO para anon/authenticated. Apenas service_role pode acessar via edge functions.';

-- =====================================================
-- 2. CHECKOUT_INTENTS - Mesma proteção
-- =====================================================

REVOKE ALL ON public.checkout_intents FROM anon, authenticated;

CREATE POLICY "checkout_intents_no_select"
ON public.checkout_intents
AS RESTRICTIVE
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "checkout_intents_no_insert"
ON public.checkout_intents
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "checkout_intents_no_update"
ON public.checkout_intents
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false);

CREATE POLICY "checkout_intents_no_delete"
ON public.checkout_intents
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);

COMMENT ON TABLE public.checkout_intents IS 'Tokens de intenção de checkout. Acesso BLOQUEADO para anon/authenticated. Apenas service_role via edge functions.';

-- =====================================================
-- 3. PROFILE_PRIVATE - Dados sensíveis separados
-- =====================================================
-- Criar tabela separada para dados sensíveis (telefone)
-- Isso reduz a superfície de ataque e permite políticas mais restritivas

CREATE TABLE public.profile_private (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

-- Políticas restritivas: usuário só acessa seus próprios dados
CREATE POLICY "Users can view their own private data"
ON public.profile_private
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own private data"
ON public.profile_private
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own private data"
ON public.profile_private
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Bloquear DELETE (dados sensíveis devem ser preservados para auditoria)
CREATE POLICY "profile_private_no_delete"
ON public.profile_private
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);

-- Bloquear acesso anon completamente
CREATE POLICY "profile_private_no_anon"
ON public.profile_private
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Índice para performance
CREATE INDEX idx_profile_private_user_id ON public.profile_private(user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_profile_private_updated_at
BEFORE UPDATE ON public.profile_private
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrar dados existentes de phone para nova tabela
INSERT INTO public.profile_private (user_id, phone, created_at, updated_at)
SELECT user_id, phone, created_at, updated_at
FROM public.profiles
WHERE phone IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  phone = EXCLUDED.phone,
  updated_at = now();

-- Remover coluna phone da tabela profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;

COMMENT ON TABLE public.profile_private IS 'Dados privados do usuário (telefone, etc). Separado da tabela profiles para reduzir superfície de ataque. RLS restritivo: apenas o próprio usuário pode acessar.';

-- =====================================================
-- 4. SECURITY_EVENTS - Tabela de auditoria de segurança
-- =====================================================

CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  user_id UUID,
  ip_hash TEXT,
  endpoint TEXT,
  request_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS e bloquear tudo para usuários
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Apenas service_role pode acessar
CREATE POLICY "security_events_no_access"
ON public.security_events
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false);

REVOKE ALL ON public.security_events FROM anon, authenticated;

-- Índices para queries de auditoria
CREATE INDEX idx_security_events_type ON public.security_events(event_type);
CREATE INDEX idx_security_events_user ON public.security_events(user_id);
CREATE INDEX idx_security_events_created ON public.security_events(created_at DESC);

COMMENT ON TABLE public.security_events IS 'Eventos de segurança para auditoria. Acesso BLOQUEADO para usuários. Apenas service_role via edge functions.';

-- =====================================================
-- 5. FUNÇÃO DE LIMPEZA ATUALIZADA
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_security_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Delete rate limit records older than 1 hour
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 hour';
    
    -- Delete checkout intents older than 24 hours
    DELETE FROM public.checkout_intents WHERE created_at < now() - interval '24 hours';
    
    -- Delete security events older than 90 days
    DELETE FROM public.security_events WHERE created_at < now() - interval '90 days';
END;
$$;

-- =====================================================
-- RESUMO DE ACESSO
-- =====================================================
-- | Tabela           | anon | authenticated | service_role |
-- |------------------|------|---------------|--------------|
-- | rate_limits      | ❌   | ❌            | ✅           |
-- | checkout_intents | ❌   | ❌            | ✅           |
-- | profiles         | ❌   | ✅ (próprio)  | ✅           |
-- | profile_private  | ❌   | ✅ (próprio)  | ✅           |
-- | security_events  | ❌   | ❌            | ✅           |
-- =====================================================
