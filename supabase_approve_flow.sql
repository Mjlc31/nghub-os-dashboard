-- 1. Alterar o cargo padrão para novas contas
-- Vá até o SQL Editor no seu painel da Supabase e rode isso:

ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'Pendente';

-- Opcional: Atualizar a trigger para forçar 'Pendente' se a conta não vier com role específico
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'Pendente');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
