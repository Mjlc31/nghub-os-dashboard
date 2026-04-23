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
                // Campos básicos de identidade
                const name = payload.name || payload.full_name || payload.customer?.name || 'Lead via Webhook';
                const email = payload.email || payload.customer?.email;
                const phone = payload.phone || payload.whatsapp || payload.customer?.phone;

                // Campos extras do formulário NG.RITMO (e outros)
                const sector = payload.sector || payload.market || payload.segmento || payload.area;
                const revenue_text = payload.revenue_text || payload.faturamento || payload.revenue;
                const headcount = payload.headcount || payload.team_size || payload.equipe;
                const pain_point = payload.pain_point || payload.bottleneck || payload.dor || payload.problema;
                const instagram = payload.instagram || payload.instagram_handle || payload.ig;

                // Armazena TODAS as respostas brutas do formulário no campo form_answers
                // Remove campos já mapeados para evitar duplicidade, mas mantém o restante
                const knownFields = ['name', 'full_name', 'email', 'phone', 'whatsapp', 'customer'];
                const formAnswers: Record<string, any> = {};
                for (const [key, value] of Object.entries(payload)) {
                    if (!knownFields.includes(key) && value !== null && value !== undefined && value !== '') {
                        formAnswers[key] = value;
                    }
                }

                const leadData = {
                    name,
                    email,
                    phone,
                    sector,
                    revenue_text,
                    headcount,
                    pain_point,
                    instagram,
                    origin: config.provider,
                    stage: 'Novo Lead',
                    pipeline: config.default_pipeline || 'Geral',
                    owner_id: config.owner_id || null,
                    form_answers: Object.keys(formAnswers).length > 0 ? formAnswers : null,
                };

                // Remove campos undefined para não quebrar o insert
                Object.keys(leadData).forEach(k => {
                    if ((leadData as any)[k] === undefined) delete (leadData as any)[k];
                });

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
