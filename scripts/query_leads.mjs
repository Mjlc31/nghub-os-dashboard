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

async function checkLeads() {
    console.log("Fetching recent leads from specific origin or stage...");
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(20);

    if (error) {
        console.error("Error fetching:", error);
    } else {
        console.log("Last 20 Leads:", JSON.stringify(data, null, 2));
    }
}

checkLeads();
