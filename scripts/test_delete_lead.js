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

async function testDelete() {
    console.log("Logging in...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'nghub@gmail.com',
        password: 'ng2026!'
    });

    if (authError) {
        console.error("Auth error:", authError);
        return;
    }
    console.log("Logged in successfully. Fetching a lead...");
    const { data: leads, error: fetchError } = await supabase.from('leads').select('id, name').limit(1);
    if (fetchError || !leads || leads.length === 0) {
        console.error("No lead to delete or fetch error:", fetchError);
        return;
    }
    const leadId = leads[0].id;
    console.log(`Found lead ${leads[0].name} - ID ${leadId}. Attempting delete...`);

    const { data, error } = await supabase.from('leads').delete().eq('id', leadId);
    if (error) {
        console.error("Error deleting lead:", JSON.stringify(error, null, 2));
    } else {
        console.log("Successfully deleted lead:", data);
    }
}

testDelete();
