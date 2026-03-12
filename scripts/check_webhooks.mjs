import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const lines = envFile.split('\n');
let localUrl = '';
let localKey = '';
lines.forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) localUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) localKey = line.split('=')[1].trim();
});

const supabase = createClient(localUrl, localKey);

async function checkWebhooks() {
    console.log("--- CONFIGURACOES DE WEBHOOKS ---");
    const { data: configs, error: errC } = await supabase.from('webhook_configs').select('*');
    if (errC) console.error("Erro configs:", errC);
    else console.log(JSON.stringify(configs, null, 2));

    console.log("\n--- ULTIMOS 5 LOGS DE WEBHOOKS ---");
    const { data: logs, error: errL } = await supabase.from('webhook_logs').select('*').order('created_at', { ascending: false }).limit(5);
    if (errL) console.error("Erro logs:", errL);
    else console.log(JSON.stringify(logs, null, 2));
}

checkWebhooks();
