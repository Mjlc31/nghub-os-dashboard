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

console.log(`Conectando em: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
    console.log('\n============================');
    console.log('   VERIFICAÇÃO DE LEADS - CRM');
    console.log('============================\n');

    // 1. Todos os leads (limitado a 10 mais recentes)
    const { data: recentLeads, error: recentErr } = await supabase
        .from('leads')
        .select('id, name, email, whatsapp, phone, stage, source, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (recentErr) {
        console.error('❌ Erro ao buscar leads:', recentErr.message, recentErr.details);
        return;
    }

    console.log(`✅ Total de leads encontrados (últimos 10): ${recentLeads.length}`);

    if (recentLeads.length === 0) {
        console.log('\n⚠️  Nenhum lead encontrado na tabela!');
    } else {
        console.log('\n--- Leads Recentes ---');
        recentLeads.forEach((lead, i) => {
            const date = new Date(lead.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            console.log(`\n[${i + 1}] ${lead.name}`);
            console.log(`    📧 Email:     ${lead.email || '(vazio)'}`);
            console.log(`    📱 WhatsApp:  ${lead.whatsapp || lead.phone || '(vazio)'}`);
            console.log(`    🏷️  Stage:     ${lead.stage || '(vazio)'}`);
            console.log(`    🔗 Source:    ${lead.source || '(vazio)'}`);
            console.log(`    📅 Criado em: ${date}`);
        });
    }

    // 2. Leads criados a partir de 01/03/2026 (nossos testes)
    console.log('\n--- Leads desde 01/03/2026 (inclui testes) ---');
    const { data: testLeads, error: testErr } = await supabase
        .from('leads')
        .select('id, name, email, whatsapp, phone, created_at')
        .gte('created_at', '2026-03-01T00:00:00.000Z')
        .order('created_at', { ascending: false });

    if (!testErr) {
        console.log(`Total desde 01/03/2026: ${testLeads.length}`);
        testLeads.forEach(l => {
            const date = new Date(l.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            console.log(`  -> [${date}] ${l.name} | ${l.email} | WA: ${l.whatsapp || l.phone || '?'}`);
        });
    } else {
        console.error('❌ Erro ao buscar leads recentes:', testErr.message);
    }

    // 3. Conta total de leads
    const { count, error: countErr } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

    if (!countErr) {
        console.log(`\n📊 Total de leads na base: ${count}`);
    }
}

checkLeads();
