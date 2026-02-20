const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
let supabaseUrl = ''; let supabaseKey = '';
envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const validStages = ['Novo Lead', 'Qualificado', 'Em Negociação', 'Venda Fechada', 'Churn'];
    const { data: leads, error } = await supabase.from('leads').select('id, stage');
    if (error) return console.error(error);

    let toUpdate = [];
    leads.forEach(l => {
        if (!validStages.includes(l.stage)) {
            toUpdate.push(l.id);
        }
    });

    console.log(`Found ${toUpdate.length} leads with invalid/hidden stages.`);

    if (toUpdate.length > 0) {
        const { error: updateErr } = await supabase
            .from('leads')
            .update({ stage: 'Novo Lead' })
            .in('id', toUpdate);
        if (updateErr) console.error('Failed to update:', updateErr);
        else console.log('Successfully migrated hidden leads to Novo Lead stage.');
    }
}
run();
