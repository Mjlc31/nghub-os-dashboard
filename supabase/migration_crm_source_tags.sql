-- =====================================================
-- NGHUB OS: CRM Migration — form_answers + source_tags
-- Execute este SQL no painel Supabase > SQL Editor
-- =====================================================

-- 1. Garante que a coluna form_answers existe (JSONB)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS form_answers JSONB DEFAULT '{}';

-- 2. Nova coluna para multi-etiquetas de origem (array de texto)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_tags TEXT[] DEFAULT '{}';

-- 3. Garante permissões corretas para usuários autenticados
GRANT SELECT, INSERT, UPDATE ON leads TO authenticated;

-- 4. Verificação: retorna as colunas relevantes da tabela leads
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name IN ('form_answers', 'source_tags', 'pipeline', 'product_label')
ORDER BY column_name;
