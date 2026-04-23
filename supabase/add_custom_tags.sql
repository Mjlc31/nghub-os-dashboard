-- Copie e cole este código no SQL Editor do seu painel do Supabase e clique em RUN.

-- Adicionar suporte a múltiplas etiquetas customizáveis na tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS custom_tags jsonb DEFAULT '[]'::jsonb;
