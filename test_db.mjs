import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qsvabiflvypinzwbdlhx.supabase.co';
const supabaseKey = 'sb_publishable_0Pn9XTk7whN2pD1GEbMu_g_Rv_EHsL_';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentLeads() {
    const { data, error } = await supabase
        .from('leads')
        .select('name, email, phone, sector, form_answers, source_tags, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Erro:', error);
        return;
    }
    data.forEach(l => {
        console.log('\n=== Lead:', l.name);
        console.log('  email:', l.email);
        console.log('  sector:', l.sector);
        console.log('  created_at:', l.created_at);
        console.log('  source_tags:', JSON.stringify(l.source_tags));
        console.log('  form_answers:', JSON.stringify(l.form_answers));
    });
}
checkRecentLeads();
