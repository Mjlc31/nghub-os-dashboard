
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qsvabiflvypinzwbdlhx.supabase.co';
const supabaseKey = 'sb_publishable_0Pn9XTk7whN2pD1GEbMu_g_Rv_EHsL_';

const supabase = createClient(supabaseUrl, supabaseKey);

const LeadStage = {
  DRAFT: 'Rascunho Em Andamento',
  NEW_LEAD: 'Novo Lead',
  QUALIFIED: 'Qualificado',
  NEGOTIATION: 'Em Negociação',
  WON: 'Venda Fechada',
  CHURN: 'Churn'
};

const VALID_STAGES = Object.values(LeadStage);

async function checkInvalidStages() {
    console.log('--- Checking for Invalid Stages ---');
    
    try {
        const { data, error } = await supabase.from('leads').select('name, stage, created_at');
        if (error) throw error;

        const invalidLeads = data.filter(l => !VALID_STAGES.includes(l.stage));

        if (invalidLeads.length > 0) {
            console.log(`Found ${invalidLeads.length} leads with invalid/unmapped stages:`);
            invalidLeads.forEach(l => console.log(`- ${l.name}: Stage "${l.stage}"`));
        } else {
            console.log('All leads have valid stages mapped in the enum.');
        }

        // Check for duplicates by phone (often the unique identifier manually expected)
        const { data: phones } = await supabase.from('leads').select('name, phone');
        const phoneMap = {};
        phones?.forEach(l => {
            if (l.phone) {
                const p = l.phone.replace(/\D/g, '');
                if (!phoneMap[p]) phoneMap[p] = [];
                phoneMap[p].push(l.name);
            }
        });

        console.log('\nChecking for phone number duplicates:');
        Object.entries(phoneMap).forEach(([phone, names]) => {
            if (names.length > 1) {
                console.log(`- Phone ${phone} is used by: ${names.join(', ')}`);
            }
        });

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

checkInvalidStages();
