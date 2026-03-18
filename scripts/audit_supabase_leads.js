
const { createClient } = require('@supabase/supabase-js');

// Hardcoded for diagnostic purposes (Temporary script)
const supabaseUrl = 'https://qsvabiflvypinzwbdlhx.supabase.co';
const supabaseKey = 'sb_publishable_0Pn9XTk7whN2pD1GEbMu_g_Rv_EHsL_';

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditLeads() {
    console.log('--- Auditing Supabase Leads ---');
    
    try {
        // 1. Total count
        const { count, error: countError } = await supabase.from('leads').select('*', { count: 'exact', head: true });
        if (countError) {
            console.error('Error fetching count:', countError);
        } else {
            console.log('Total Leads in Table:', count);
        }

        // 2. Fetch all raw data to see stages
        const { data, error: fetchError } = await supabase.from('leads').select('name, stage, created_at, phone');
        if (fetchError) {
            console.error('Error fetching data:', fetchError);
        } else {
            console.log('--- List of Leads in DB ---');
            data?.forEach(l => {
                console.log(`- [${l.stage || 'NO STAGE'}] ${l.name || 'NO NAME'} (${l.phone || 'NO PHONE'}) Created: ${l.created_at}`);
            });

            // 3. Count per stage
            const counts = {};
            data?.forEach(l => {
                const s = l.stage || 'SEM_ETAPA';
                counts[s] = (counts[s] || 0) + 1;
            });
            console.log('\nLeads per Stage:', counts);
        }
    } catch (err) {
        console.error('Fatal error:', err);
    }
}

auditLeads();
