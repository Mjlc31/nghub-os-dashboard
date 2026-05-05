import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Carregar .env.local
const envPath = resolve(process.cwd(), '.env.local');
const env = {};
if (existsSync(envPath)) {
    readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const idx = trimmed.indexOf('=');
        if (idx > 0) env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).trim();
    });
}

const url = env['VITE_SUPABASE_URL'];
const key = env['SUPABASE_SERVICE_ROLE_KEY'] || env['VITE_SUPABASE_ANON_KEY'];
const resendKey = env['RESEND_API_KEY'];

console.log('\n=== DIAGNÓSTICO DO SISTEMA ===\n');
console.log('Supabase URL:', url ? `${url.slice(0, 30)}...` : '❌ NÃO ENCONTRADO');
console.log('Service Role Key:', env['SUPABASE_SERVICE_ROLE_KEY'] ? '✅ Configurada' : '⚠️ Usando anon key');
console.log('Resend API Key:', resendKey ? `✅ ${resendKey.slice(0, 12)}...` : '❌ NÃO ENCONTRADO');

const supabase = createClient(url, key);

// 1. Sellers com email
console.log('\n--- SELLERS ---');
const { data: sellers, error: sellersErr } = await supabase
    .from('sellers')
    .select('id, name, phone, email');

if (sellersErr) {
    console.error('❌ Erro ao buscar sellers:', sellersErr.message);
} else {
    sellers.forEach(s => {
        const emailStatus = s.email ? `✅ ${s.email}` : '❌ sem email';
        console.log(`  ${s.name}: ${emailStatus}`);
    });
    const withEmail = sellers.filter(s => s.email).length;
    console.log(`\n  Total: ${sellers.length} vendedores | ${withEmail} com e-mail`);
}

// 2. Leads recentes com form_answers
console.log('\n--- LEADS RECENTES ---');
const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .select('id, name, email, phone, origin, form_answers, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

if (leadsErr) {
    console.error('❌ Erro ao buscar leads:', leadsErr.message);
} else {
    leads.forEach(l => {
        const hasAnswers = l.form_answers ? `✅ ${Object.keys(l.form_answers).length} respostas` : '— sem form_answers';
        console.log(`  [${new Date(l.created_at).toLocaleDateString('pt-BR')}] ${l.name} | ${l.origin || 'sem origem'} | ${hasAnswers}`);
    });
}

console.log('\n=== FIM DO DIAGNÓSTICO ===\n');
