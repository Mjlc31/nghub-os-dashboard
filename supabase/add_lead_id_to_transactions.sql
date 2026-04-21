-- ============================================================
-- NGHUB OS — Migration: Adicionar lead_id em transactions
-- BUG-2 e BUG-5: Elimina lookups frágeis por LIKE/em dash
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Adiciona coluna lead_id (UUID nullable, FK para leads)
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- 2. Cria índice para buscas por lead_id (performance)
CREATE INDEX IF NOT EXISTS idx_transactions_lead_id ON public.transactions(lead_id);

-- 3. Verificação
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions' AND column_name = 'lead_id';
