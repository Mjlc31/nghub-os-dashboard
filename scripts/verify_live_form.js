const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        if (line.startsWith('VITE_SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1].trim();
        }
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
            supabaseKey = line.split('=')[1].trim();
        }
    });
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyLead() {
    const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('Error fetching leads:', error.message);
    } else {
        console.log('--- Last 3 Leads in Database ---');
        leads.forEach(l => {
            console.log(`- ${l.name} (${l.email}) | Stage: ${l.stage} | Created: ${l.created_at}`);
        });
    }
}

verifyLead();
