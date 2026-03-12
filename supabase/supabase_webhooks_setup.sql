-- Webhook Configurations Table
CREATE TABLE IF NOT EXISTS public.webhook_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'hotmart', 'stripe', 'typeform', 'custom', etc.
    slug TEXT UNIQUE NOT NULL,
    secret_token TEXT DEFAULT md5(random()::text),
    target_module TEXT NOT NULL, -- 'crm', 'finance'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Webhook Execution/Delivery Logs Table
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID REFERENCES public.webhook_configs(id) ON DELETE CASCADE,
    payload JSONB,
    status TEXT NOT NULL, -- 'success', 'error'
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policies for webhook_configs
CREATE POLICY "Users can manage their own webhook configs" ON public.webhook_configs
    FOR ALL USING (auth.uid() = owner_id);

-- Policies for webhook_logs
CREATE POLICY "Users can view logs for their own webhooks" ON public.webhook_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.webhook_configs
            WHERE public.webhook_configs.id = webhook_id
            AND public.webhook_configs.owner_id = auth.uid()
        )
    );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_webhook_configs_slug ON public.webhook_configs(slug);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);
