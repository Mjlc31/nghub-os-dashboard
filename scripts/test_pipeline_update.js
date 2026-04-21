const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
    });
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPipelineUpdate() {
    const { data: leads, error: fetchErr } = await supabase.from('leads').select('id, name, pipeline').limit(1);
    if (!leads || leads.length === 0) return console.log("No leads");
    
    const leadId = leads[0].id;
    console.log(`Updating lead ${leads[0].name} to pipeline 'Evento'`);
    
    const { error } = await supabase.from('leads')
        .update({ pipeline: 'Evento', tag_id: null, product_label: null })
        .eq('id', leadId);
        
    if (error) {
        console.error("❌ Erro:", error.message, error.details, error.hint);
    } else {
        console.log("✅ Pipeline updated successfully");
    }
}
testPipelineUpdate();
