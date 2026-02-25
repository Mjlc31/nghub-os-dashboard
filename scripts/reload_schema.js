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

async function reloadSchema() {
    console.log("Calling rpc to reload schema...");

    // O Supabase PostgREST recarrega quando fazemos um NOTIFY ou via dashboard.
    // Como não temos um RPC default para reload de schema criado pelo usuário (NOTIFY pgrst, 'reload schema'),
    // Faremos um dummy insert p/ forçar atualização do cache na API. Ou chamar rpc.

    // Vamos buscar na api um trigger se existir
    const { data, error } = await supabase.rpc('reload_schema');

    if (error) {
        console.error("No reload_schema RPC found. Please go to your Supabase Dashboard -> SQL Editor and run:\nNOTIFY pgrst, 'reload schema';");
    } else {
        console.log("Schema reloaded via RPC.", data);
    }
}

reloadSchema();
