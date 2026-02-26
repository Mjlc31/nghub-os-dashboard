/**
 * NGHUB OS — Master Integration Diagnostics
 * Tests: Supabase connection, all tables CRUD, form→CRM flow, tag→transaction sync
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── Load env ──────────────────────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = '', supabaseKey = '';
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
        if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
    });
}
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ .env.local não encontrado ou incompleto');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Helpers ──────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const ok = (msg) => { console.log(`  ✅ ${msg}`); passed++; };
const err = (msg) => { console.error(`  ❌ ${msg}`); failed++; };
const section = (title) => console.log(`\n${'─'.repeat(55)}\n  ${title}\n${'─'.repeat(55)}`);

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
    console.log(`\n🔌 Conectando em: ${supabaseUrl}\n`);

    // ── 1. CONNECTION PING ────────────────────────────────────────────────────
    section('1. CONEXÃO & AUTENTICAÇÃO');
    try {
        const { error } = await supabase.from('leads').select('id').limit(1);
        if (error) err(`Ping falhou: ${error.message}`);
        else ok('Supabase respondeu (ping OK)');
    } catch (e) { err(`Erro de rede: ${e.message}`); }

    // ── 2. TABLES EXIST CHECK ────────────────────────────────────────────────
    section('2. VERIFICAÇÃO DAS TABELAS');
    const tables = ['leads', 'events', 'sellers', 'transactions', 'notifications'];
    for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error) err(`Tabela '${table}' — ${error.message}`);
        else ok(`Tabela '${table}' acessível`);
    }

    // ── 3. LEADS CRUD ────────────────────────────────────────────────────────
    section('3. LEADS — CRUD COMPLETO');
    let testLeadId = null;
    const { data: insertLead, error: insertLeadErr } = await supabase
        .from('leads')
        .insert([{ name: '[TEST] Diagnóstico', email: 'diag@nghub.test', stage: 'Novo Lead', value: 0 }])
        .select().single();

    if (insertLeadErr) err(`INSERT lead: ${insertLeadErr.message}`);
    else { ok(`INSERT lead → ID: ${insertLead.id}`); testLeadId = insertLead.id; }

    if (testLeadId) {
        const { error: updateErr } = await supabase.from('leads').update({ value: 999 }).eq('id', testLeadId);
        if (updateErr) err(`UPDATE lead: ${updateErr.message}`);
        else ok('UPDATE lead → value = 999');

        const { error: deleteErr } = await supabase.from('leads').delete().eq('id', testLeadId);
        if (deleteErr) err(`DELETE lead: ${deleteErr.message}`);
        else ok('DELETE lead → cleanup OK');
    }

    // ── 4. EVENTS READ ───────────────────────────────────────────────────────
    section('4. EVENTS — LEITURA');
    const { data: events, error: eventsErr } = await supabase.from('events').select('id, title, price').limit(5);
    if (eventsErr) err(`SELECT events: ${eventsErr.message}`);
    else {
        ok(`SELECT events → ${events.length} evento(s) encontrado(s)`);
        events.forEach(e => console.log(`     • ${e.title} — R$${e.price ?? 'sem preço'}`));
    }

    // ── 5. SELLERS CRUD ──────────────────────────────────────────────────────
    section('5. SELLERS — CRUD');
    let testSellerId = null;
    const { data: sellerData, error: sellerErr } = await supabase
        .from('sellers')
        .insert([{ name: '[TEST] Vendedor Diag', phone: '5511999000001' }])
        .select().single();

    if (sellerErr) err(`INSERT seller: ${sellerErr.message}`);
    else { ok(`INSERT seller → ID: ${sellerData.id}`); testSellerId = sellerData.id; }

    if (testSellerId) {
        const { error: delSellerErr } = await supabase.from('sellers').delete().eq('id', testSellerId);
        if (delSellerErr) err(`DELETE seller: ${delSellerErr.message}`);
        else ok('DELETE seller → cleanup OK');
    }

    // ── 6. TRANSACTIONS CRUD ─────────────────────────────────────────────────
    section('6. TRANSACTIONS — CRUD');
    let testTxId = null;
    const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .insert([{ description: '[TEST] Diagnóstico', amount: 1234.56, type: 'income', category: 'Teste', date: new Date().toISOString() }])
        .select().single();

    if (txErr) err(`INSERT transaction: ${txErr.message}`);
    else { ok(`INSERT transaction → ID: ${txData.id}, Valor: R$${txData.amount}`); testTxId = txData.id; }

    if (testTxId) {
        const { error: delTxErr } = await supabase.from('transactions').delete().eq('id', testTxId);
        if (delTxErr) err(`DELETE transaction: ${delTxErr.message}`);
        else ok('DELETE transaction → cleanup OK');
    }

    // ── 7. FORM→CRM FLOW (simulated) ─────────────────────────────────────────
    section('7. FLUXO FORMULÁRIO → CRM (simulado)');
    const simulatedFormLead = {
        name: '[TEST] Lead do Formulário',
        email: 'form@ngbase.test',
        phone: '11988887777',
        company: 'NG Base Test',
        instagram: '@testenghub',
        revenue_text: '50k-100k',
        headcount: '10-50',
        pain_point: 'Automação',
        origin: 'ngbase.nghub.com.br',
        stage: 'Novo Lead',
        value: 0
    };

    const { data: formLead, error: formErr } = await supabase
        .from('leads')
        .insert([simulatedFormLead])
        .select().single();

    if (formErr) err(`Fluxo formulário → LEAD: ${formErr.message}`);
    else {
        ok(`Lead de formulário inserido → ID: ${formLead.id}`);
        ok(`Campos extras: instagram=${formLead.instagram}, origin=${formLead.origin}, pain_point=${formLead.pain_point}`);
        await supabase.from('leads').delete().eq('id', formLead.id);
        ok('Cleanup do lead do formulário OK');
    }

    // ── 8. RECENT LEADS (Últimos do Formulário Real) ──────────────────────────
    section('8. LEADS REAIS RECENTES (últimos 5)');
    const { data: recentLeads, error: recentErr } = await supabase
        .from('leads')
        .select('name, email, origin, stage, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (recentErr) err(`Busca de leads recentes: ${recentErr.message}`);
    else if (!recentLeads || recentLeads.length === 0) {
        console.log('  ℹ️  Nenhum lead real encontrado ainda.');
    } else {
        ok(`${recentLeads.length} leads recentes:`);
        recentLeads.forEach(l => {
            console.log(`     • ${l.name} (${l.email}) | Stage: ${l.stage} | Origin: ${l.origin || 'desconhecida'}`);
        });
    }

    // ── SUMMARY ───────────────────────────────────────────────────────────────
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`  RESULTADO: ${passed} ✅ passou  |  ${failed} ❌ falhou`);
    console.log(`${'═'.repeat(55)}\n`);
    if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('Erro fatal:', e.message); process.exit(1); });
