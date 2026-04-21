-- Copie e cole este código no SQL Editor do seu painel do Supabase e clique em RUN.

-- 1. Adicionar colunas faltantes na tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS product_label text,
ADD COLUMN IF NOT EXISTS form_answers jsonb DEFAULT '{}'::jsonb;

-- 2. Garantir que a coluna pipeline existe (caso não exista)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS pipeline text DEFAULT 'Geral';

-- 3. (Opcional) Adicionar RLS policy se necessário para update nas novas colunas
-- Normalmente o Supabase já aplica as políticas da tabela como um todo.
