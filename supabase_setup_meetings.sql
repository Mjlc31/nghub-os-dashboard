-- Copie e cole este código no SQL Editor do seu painel do Supabase e clique em RUN.

-- 1. Tabela de Sessões de Reunião
CREATE TABLE IF NOT EXISTS public.meeting_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    meeting_date date NOT NULL,
    meeting_time time NOT NULL,
    agenda text,
    type text NOT NULL CHECK (type IN ('regular', 'extraordinary', 'board')),
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Atas de Reunião (Preenchidas pelos membros)
CREATE TABLE IF NOT EXISTS public.meeting_minutes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES public.meeting_sessions(id) ON DELETE CASCADE NOT NULL,
    author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    author_name text NOT NULL,
    present boolean DEFAULT true NOT NULL,
    highlights text,
    commitments text,
    general_notes text,
    submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(session_id, author_id)
);

-- 3. Políticas de Segurança (RLS)

-- Habilitar RLS
ALTER TABLE public.meeting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

-- Sessões: Qualquer usuário autenticado pode ver (para que membros vejam a reunião aberta)
CREATE POLICY "Sessões visíveis para todos os usuários" ON public.meeting_sessions FOR SELECT TO authenticated USING (true);

-- Sessões: Apenas admin pode inserir/atualizar (opcionalmente você pode restringir se quiser)
CREATE POLICY "Sessões podem ser criadas por qualquer admin" ON public.meeting_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Sessões podem ser atualizadas por qualquer admin" ON public.meeting_sessions FOR UPDATE TO authenticated USING (true);

-- Atas: Usuários podem ver as atas de sua própria autoria. Admins podem ver todas (gerenciado no front-end ou adicionando regras complexas de RLS).
CREATE POLICY "Membros podem ver todas as atas da sessão" ON public.meeting_minutes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Membros podem inserir suas próprias atas" ON public.meeting_minutes FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Membros podem atualizar suas próprias atas" ON public.meeting_minutes FOR UPDATE TO authenticated USING (auth.uid() = author_id);

-- 4. Atualizar o cache de schema da API do Supabase (MUITO IMPORTANTE)
NOTIFY pgrst, 'reload schema';
