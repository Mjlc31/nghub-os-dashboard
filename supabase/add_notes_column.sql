-- Adiciona a coluna 'notes' na tabela 'leads' para suportar anotações sem limite de caracteres
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;
