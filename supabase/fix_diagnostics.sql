-- ============================================================
-- NGHUB OS — Fix de 2 Problemas Encontrados no Diagnóstico
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- FIX 1: Criar a tabela 'notifications'
-- (necessária para o sistema de notificações do app)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    message     TEXT,
    type        TEXT DEFAULT 'info',  -- 'info' | 'success' | 'warning' | 'error'
    read        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Habilita RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies: usuário só vê/edita suas próprias notificações
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- FIX 2: Corrigir RLS da tabela 'transactions'
-- (bloqueia INSERT anônimo para matching do formulário → CRM)
-- ────────────────────────────────────────────────────────────

-- Primeiro, veja as políticas atuais:
-- SELECT * FROM pg_policies WHERE tablename = 'transactions';

-- Permitir INSERT público (anon) para que o CRM possa criar 
-- transações automaticamente ao fechar vendas
DROP POLICY IF EXISTS "Allow anon insert transactions" ON public.transactions;
CREATE POLICY "Allow anon insert transactions"
    ON public.transactions FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select transactions" ON public.transactions;
CREATE POLICY "Allow select transactions"
    ON public.transactions FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow update transactions" ON public.transactions;
CREATE POLICY "Allow update transactions"
    ON public.transactions FOR UPDATE
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow delete transactions" ON public.transactions;
CREATE POLICY "Allow delete transactions"
    ON public.transactions FOR DELETE
    TO anon, authenticated
    USING (true);

-- ────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL (execute após as correções)
-- ────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename IN ('notifications', 'transactions')
ORDER BY tablename, cmd;
