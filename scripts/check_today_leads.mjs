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

// Busca leads de hoje (05/03/2026)
const { data: today, error: e1 } = await supabase
    .from('leads')
    .select('id, name, email, phone, stage, origin, instagram, revenue_text, headcount, pain_point, created_at')
    .gte('created_at', '2026-03-05T00:00:00Z')
    .order('created_at', { ascending: false });

if (e1) { console.log('ERRO hoje:', e1.message); }
else {
    console.log('=== LEADS DE HOJE (05/03/2026) ===');
    console.log('Total:', today.length);
    today.forEach(l => {
        const date = new Date(l.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        console.log('\n[' + date + '] ' + l.name);
        console.log('  Email:', l.email || '-');
        console.log('  Phone:', l.phone || '-');
        console.log('  Stage:', l.stage);
        console.log('  Origem:', l.origin || '-');
        console.log('  Faturamento:', l.revenue_text || '-');
        console.log('  Equipe:', l.headcount || '-');
        console.log('  Instagram:', l.instagram || '-');
    });
}

// Busca específica por Antigravity
const { data: ag, error: e2 } = await supabase
    .from('leads')
    .select('*')
    .ilike('name', '%Antigravity%');

console.log('\n=== BUSCA: "Antigravity" ===');
if (e2) { console.log('ERRO:', e2.message); }
else if (ag.length === 0) { console.log('NAO ENCONTRADO na base!'); }
else {
    console.log('ENCONTRADO:', ag.length, 'registro(s)');
    ag.forEach(l => {
        const date = new Date(l.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        console.log(JSON.stringify({ ...l, created_at: date }, null, 2));
    });
}

// Conta total
const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true });
console.log('\nTOTAL DE LEADS NA BASE:', count);
