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

async function injectLead() {
    console.log("Simulating external form submission...");
    const { data, error } = await supabase.from('leads').insert([{
        name: 'Zambrota System Test',
        company: 'Zambrota Tech',
        email: 'zambrota@nghub.com.br',
        phone: '11999999999',
        stage: 'Rascunho Em Andamento',
        value: 0
    }]).select();

    if (error) {
        console.error("Error inserting:", error);
    } else {
        console.log("Successfully inserted simulated external lead:", data[0]);
    }
}

injectLead();
