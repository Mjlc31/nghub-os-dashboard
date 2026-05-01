-- Migration: Adicionar coluna email à tabela sellers
-- Execute este script no Supabase SQL Editor

-- 1. Adicionar coluna de email (se não existir)
ALTER TABLE public.sellers
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. (Opcional) Adicionar comentário descritivo
COMMENT ON COLUMN public.sellers.email IS 'E-mail do vendedor para notificações de novos leads';

-- Verificar resultado
SELECT id, name, phone, email, created_at FROM public.sellers LIMIT 5;
