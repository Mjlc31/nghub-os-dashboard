
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qsvabiflvypinzwbdlhx.supabase.co';
const supabaseKey = 'sb_publishable_0Pn9XTk7whN2pD1GEbMu_g_Rv_EHsL_';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getRecentLeads() {
    console.log('--- Ultimos 10 Leads Criados ---');
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('name, stage, pipeline, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (error) throw error;

        data.forEach((l, i) => {
            console.log(`${i+1}. [${l.stage}] ${l.name} - Pipeline: ${l.pipeline} (${new Date(l.created_at).toLocaleString('pt-BR')})`);
        });
    } catch (err) {
        console.error(err);
    }
}

getRecentLeads();
