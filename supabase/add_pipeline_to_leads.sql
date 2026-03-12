-- Adiciona a coluna pipeline na tabela leads para suportar múltiplas pipelines
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline TEXT DEFAULT 'Geral';
