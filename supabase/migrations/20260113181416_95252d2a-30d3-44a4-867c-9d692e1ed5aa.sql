-- =====================================================
-- LEDGER IMUTÁVEL: Políticas restritivas para credit_transactions
-- =====================================================
-- Esta tabela funciona como um ledger imutável onde:
-- - Usuários podem apenas ver (SELECT) suas próprias transações
-- - Usuários podem apenas criar (INSERT) suas próprias transações
-- - NINGUÉM pode alterar (UPDATE) transações existentes
-- - NINGUÉM pode deletar (DELETE) transações existentes
-- - Correções/ajustes são feitos via INSERT de transações compensatórias
--   (tipo: 'reversal', 'adjustment', 'chargeback')
-- =====================================================

-- Confirmar que RLS está habilitado (idempotente)
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RESTRITIVAS (bloqueiam UPDATE e DELETE para todos)
-- =====================================================
-- Nota: Políticas RESTRICTIVE sempre devem passar junto com 
-- quaisquer políticas PERMISSIVE. Ao negar tudo aqui,
-- garantimos que mesmo futuras políticas permissivas não
-- permitirão UPDATE/DELETE.

-- Bloquear UPDATE para todos os usuários (authenticated e anon)
-- Esta política RESTRICTIVE nega qualquer tentativa de UPDATE
CREATE POLICY "Ledger imutável: bloquear UPDATE para todos"
ON public.credit_transactions
AS RESTRICTIVE
FOR UPDATE
TO authenticated, anon
USING (false);

-- Bloquear DELETE para todos os usuários (authenticated e anon)  
-- Esta política RESTRICTIVE nega qualquer tentativa de DELETE
CREATE POLICY "Ledger imutável: bloquear DELETE para todos"
ON public.credit_transactions
AS RESTRICTIVE
FOR DELETE
TO authenticated, anon
USING (false);

-- =====================================================
-- DOCUMENTAÇÃO DE ACESSO
-- =====================================================
-- | Role          | SELECT | INSERT | UPDATE | DELETE |
-- |---------------|--------|--------|--------|--------|
-- | anon          | ❌     | ❌     | ❌     | ❌     |
-- | authenticated | ✅*    | ✅*    | ❌     | ❌     |
-- | service_role  | ✅     | ✅     | ✅     | ✅     |
-- 
-- * = apenas próprias transações (user_id = auth.uid())
-- 
-- Para correções administrativas (chargeback, ajuste manual):
-- 1. Usar edge function com service_role
-- 2. Inserir transação compensatória com type = 'reversal' ou 'adjustment'
-- 3. NUNCA editar ou deletar transações existentes
-- =====================================================

-- Adicionar comentário na tabela documentando o padrão
COMMENT ON TABLE public.credit_transactions IS 'Ledger imutável de transações de créditos. UPDATE/DELETE bloqueados para usuários. Correções via INSERT de transações compensatórias (type: reversal, adjustment, chargeback).';
