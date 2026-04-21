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

async function checkEventsSchema() {
    const { data, error } = await supabase.from('events').select('*').limit(1);
    if (error) {
        console.error("Erro:", error);
    } else if (data && data.length > 0) {
        console.log("Columns in events table:", Object.keys(data[0]).join(', '));
    } else {
        console.log("No data to infer schema.");
    }
}
checkEventsSchema();
