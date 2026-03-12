import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!; // Idealmente usar a Service Role Key se possível, mas ANON funciona se políticas RLS permitirem inserção via webhook
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { slug } = req.query;
    const payload = req.body;

    try {
        // 1. Buscar a configuração do webhook
        const { data: config, error: configError } = await supabase
            .from('webhook_configs')
            .select('*')
            .eq('slug', slug)
            .single();

        if (configError || !config) {
            return res.status(404).json({ error: 'Webhook configuration not found' });
        }

        if (!config.is_active) {
            return res.status(403).json({ error: 'Webhook is inactive' });
        }

        // 2. Processar baseado no módulo de destino
        let processingResult = { status: 'success', error: null };

        try {
            if (config.target_module === 'crm') {
                // Mapeamento básico para Leads (ajustar conforme o provedor)
                const leadData = {
                    name: payload.name || payload.full_name || payload.customer?.name || 'Lead via Webhook',
                    email: payload.email || payload.customer?.email,
                    phone: payload.phone || payload.whatsapp || payload.customer?.phone,
                    origin: config.provider,
                    stage: 'Novo Lead',
                    owner_id: config.owner_id,
                    notes: `Dados originais: ${JSON.stringify(payload)}`
                };

                const { error: insertError } = await supabase.from('leads').insert(leadData);
                if (insertError) throw insertError;
            }
            else if (config.target_module === 'finance') {
                // Mapeamento básico para Transações
                const transactionData = {
                    description: `Venda via ${config.provider}`,
                    amount: payload.amount || payload.price || 0,
                    type: 'income',
                    status: 'paid',
                    date: new Date().toISOString(),
                    category: 'Vendas Automáticas'
                };

                const { error: insertError } = await supabase.from('transactions').insert(transactionData);
                if (insertError) throw insertError;
            }
        } catch (procError: any) {
            processingResult = { status: 'error', error: procError.message };
        }

        // 3. Logar a execução
        await supabase.from('webhook_logs').insert({
            webhook_id: config.id,
            payload,
            status: processingResult.status,
            error_message: processingResult.error
        });

        return res.status(200).json({
            message: 'Webhook processed',
            status: processingResult.status
        });

    } catch (err: any) {
        console.error('Fatal webhook error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
