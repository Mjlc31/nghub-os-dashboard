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

async function checkRLS() {
    console.log("Checking leads policies by triggering a delete without auth...");

    const { data: leads, error: fetchError } = await supabase.from('leads').select('id, name').limit(1);
    if (fetchError || !leads || leads.length === 0) {
        console.error("Fetch error:", fetchError);
        return;
    }

    const { data, error } = await supabase.from('leads').delete().eq('id', leads[0].id);
    console.log("Delete without auth result:", error ? error.message : "Success");
}

checkRLS();
