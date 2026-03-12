/**
 * NGHUB OS — Live Form → CRM Data Flow Test
 * 
 * Simula EXATAMENTE o payload que o formulário NG.BASE envia,
 * verifica se o dado chega íntegro e aparece no CRM.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── Env ───────────────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = '', supabaseKey = '';
fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Payload real do formulário NG.BASE ────────────────────────────
const TIMESTAMP = new Date().toISOString();
const TEST_EMAIL = `formtest.${Date.now()}@ngbase.test`;

const formPayload = {
    // Campos básicos
    name: 'Arthur Teste Formulário',
    email: TEST_EMAIL,
    phone: '11988887766',
    company: 'Empresa Teste NGHUB',
    // Campos extras do formulário
    instagram: '@arthurhubtest',
    revenue_text: '100k-500k',
    headcount: '10-50',
    pain_point: 'Captura de leads e automação de vendas',
    origin: 'Site NG.BASE',
    // Stage padrão ao entrar no CRM
    stage: 'Novo Lead',
    value: 0,
};

async function runTest() {
    console.log('\n══════════════════════════════════════════════════════');
    console.log('  NGHUB OS — TESTE DE FLUXO FORMULÁRIO → CRM');
    console.log('══════════════════════════════════════════════════════\n');

    console.log('📋 Payload do formulário que será enviado:');
    Object.entries(formPayload).forEach(([k, v]) => {
        console.log(`   ${k.padEnd(15)} → ${v}`);
    });

    // ── STEP 1: Contar leads antes ────────────────────────────────
    const { count: before } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Leads no banco ANTES do envio: ${before}`);

    // ── STEP 2: Inserir (simula form submit) ──────────────────────
    console.log('\n🚀 Enviando dados (simulando submit do formulário)...');
    const { data: insertedLead, error: insertError } = await supabase
        .from('leads')
        .insert([formPayload])
        .select()
        .single();

    if (insertError) {
        console.error(`\n❌ FALHOU ao inserir: ${insertError.message}`);
        if (insertError.code === '42501') {
            console.error('   → Erro de RLS: usuário anônimo sem permissão de insert.');
        }
        process.exit(1);
    }

    console.log(`✅ Lead enviado com sucesso! ID gerado: ${insertedLead.id}`);

    // ── STEP 3: Ler de volta (simula CRM carregando os dados) ─────
    console.log('\n🔍 Lendo de volta como o CRM faria...');
    const { data: readBack, error: readError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', insertedLead.id)
        .single();

    if (readError) {
        console.error(`❌ Falhou ao ler: ${readError.message}`);
        process.exit(1);
    }

    // ── STEP 4: Verificar todos os campos ─────────────────────────
    console.log('\n🧪 Verificando campos recebidos:\n');
    const checks = [
        ['name', formPayload.name],
        ['email', formPayload.email],
        ['phone', formPayload.phone],
        ['company', formPayload.company],
        ['instagram', formPayload.instagram],
        ['revenue_text', formPayload.revenue_text],
        ['headcount', formPayload.headcount],
        ['pain_point', formPayload.pain_point],
        ['origin', formPayload.origin],
        ['stage', formPayload.stage],
    ];

    let allPassed = true;
    checks.forEach(([field, expected]) => {
        const received = readBack[field];
        const ok = received === expected;
        if (!ok) allPassed = false;
        const icon = ok ? '✅' : '❌';
        console.log(`  ${icon} ${field.padEnd(15)} esperado="${expected}" | recebido="${received}"`);
    });

    // ── STEP 5: Contar leads depois ───────────────────────────────
    const { count: after } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Leads no banco DEPOIS do envio: ${after} (+${after - before})`);

    // ── STEP 6: Cleanup ───────────────────────────────────────────
    await supabase.from('leads').delete().eq('id', insertedLead.id);
    console.log(`\n🧹 Lead de teste removido (cleanup OK)\n`);

    // ── Resultado ─────────────────────────────────────────────────
    console.log('══════════════════════════════════════════════════════');
    if (allPassed) {
        console.log('  🎉 RESULTADO: TODOS OS CAMPOS CHEGARAM CORRETAMENTE!');
        console.log('  O fluxo Formulário → CRM está 100% funcional.');
    } else {
        console.log('  ⚠️  RESULTADO: Alguns campos não chegaram como esperado.');
        console.log('  Verifique os campos marcados com ❌ acima.');
    }
    console.log('══════════════════════════════════════════════════════\n');

    if (!allPassed) process.exit(1);
}

runTest().catch(e => {
    console.error('\n💥 Erro fatal:', e.message);
    process.exit(1);
});
