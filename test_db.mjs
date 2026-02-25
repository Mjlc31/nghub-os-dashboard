import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qsvabiflvypinzwbdlhx.supabase.co';
const supabaseKey = 'sb_publishable_0Pn9XTk7whN2pD1GEbMu_g_Rv_EHsL_';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.from('leads').select('*').limit(1);
    if (error) {
        console.error('Error fetching leads:', error);
    } else {
        if (data && data.length > 0) {
            console.log('Columns in leads table:', Object.keys(data[0]));
        } else {
            console.log('No leads found in the table. Cannot infer schema.');
        }
    }
}

checkSchema();
