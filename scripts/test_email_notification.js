/**
 * Script de teste para validar a notificação de e-mail.
 * Uso: node scripts/test_email_notification.js
 *
 * ANTES DE RODAR:
 * 1. Adicione sua RESEND_API_KEY no .env.local
 * 2. Rode: node scripts/test_email_notification.js
 */

import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ─── Carregar .env.local manualmente ──────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local');
const env = {};
if (existsSync(envPath)) {
    readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
        const [k, ...v] = line.trim().split('=');
        if (k && v.length) env[k] = v.join('=').trim();
    });
}

const RESEND_API_KEY = env['RESEND_API_KEY'];
const SUPABASE_URL = env['VITE_SUPABASE_URL'];
const SUPABASE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'] || env['VITE_SUPABASE_ANON_KEY'];

if (!RESEND_API_KEY) { console.error('❌ RESEND_API_KEY não encontrado no .env.local'); process.exit(1); }
if (!SUPABASE_URL) { console.error('❌ VITE_SUPABASE_URL não encontrado no .env.local'); process.exit(1); }

console.log('\n🔑 Configuração carregada');
console.log('   Resend Key:', RESEND_API_KEY.slice(0, 10) + '...');
console.log('   Supabase:', SUPABASE_URL);

const resend = new Resend(RESEND_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Teste 1: Verificar vendedores com e-mail ─────────────────────────────────
console.log('\n📋 Verificando vendedores com e-mail no banco...');
const { data: sellers, error: sellersError } = await supabase
    .from('sellers')
    .select('id, name, email')
    .not('email', 'is', null)
    .neq('email', '');

if (sellersError) {
    console.error('❌ Erro ao buscar vendedores:', sellersError.message);
} else {
    console.log(`✅ ${sellers.length} vendedor(es) com e-mail encontrado(s):`);
    sellers.forEach(s => console.log(`   - ${s.name}: ${s.email}`));
}

// ─── Teste 2: Disparar e-mail de teste ───────────────────────────────────────
console.log('\n📧 Enviando e-mail de teste...');

// ATENÇÃO: Enquanto o domínio não estiver verificado no Resend,
// o "to" precisa ser o seu próprio e-mail da conta do Resend!
// Depois de verificar o domínio os.nghub.com.br, pode enviar para qualquer e-mail.
const TEST_RECIPIENT = process.argv[2] || 'nghub.co@gmail.com'; // Passe como argumento ou edite aqui

const fakeLead = {
    name: 'João Silva (TESTE)',
    phone: '82993236678',
    email: 'joao.teste@gmail.com',
    instagram: '@joaosilva',
    sector: 'Tecnologia',
    revenue_text: 'R$ 50k - R$ 100k/mês',
    headcount: '10-50 pessoas',
    pain_point: 'Preciso escalar as vendas sem aumentar o time',
    origin: 'ng.poker',
    pipeline: 'Geral',
    stage: 'Novo Lead',
    form_answers: {
        produto_interesse: 'Consultoria Estratégica',
        como_conheceu: 'Instagram'
    }
};

const { data, error } = await resend.emails.send({
    from: 'NGHUB OS <onboarding@resend.dev>', // Mude para notificacoes@os.nghub.com.br após verificar domínio
    to: [TEST_RECIPIENT],
    subject: `🎯 [TESTE] Novo Lead: ${fakeLead.name} • NGHUB OS`,
    html: buildEmailHTML(fakeLead),
});

if (error) {
    console.error('❌ Falha no envio:', error);
} else {
    console.log('✅ E-mail enviado com sucesso!');
    console.log('   ID:', data?.id);
    console.log(`   Destinatário: ${TEST_RECIPIENT}`);
    console.log('\n💡 Verifique sua caixa de entrada (ou spam).');
}

// ─── Template (copiado da API) ────────────────────────────────────────────────
function buildEmailHTML(lead) {
    const origin = lead.origin || 'Direto';
    const pipeline = lead.pipeline || 'Geral';
    const stage = lead.stage || 'Novo Lead';

    const formAnswersHTML = lead.form_answers
        ? Object.entries(lead.form_answers)
            .filter(([, v]) => v !== null && v !== '' && v !== undefined)
            .map(([k, v]) => `
            <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #1e2433;color:#8b9bb4;font-size:13px;text-transform:capitalize;">${k.replace(/_/g, ' ')}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #1e2433;color:#e2e8f0;font-size:13px;">${v}</td>
            </tr>`).join('')
        : '';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Novo Lead - NGHUB OS</title></head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e1a;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:linear-gradient(135deg,#1a1f35 0%,#0f1524 100%);border-radius:16px 16px 0 0;padding:32px;text-align:center;border:1px solid #1e2a45;border-bottom:none;">
<h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#ffffff;">🎯 Novo Lead Capturado!</h1>
<p style="margin:0;font-size:14px;color:#8b9bb4;">NGHUB OS • Sistema CRM</p>
</td></tr>
<tr><td style="background:#0f1524;border-left:1px solid #1e2a45;border-right:1px solid #1e2a45;padding:16px 32px;text-align:center;">
<span style="display:inline-block;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.4);color:#D4AF37;font-size:12px;font-weight:600;padding:6px 16px;border-radius:100px;">
📌 ${origin} &nbsp;·&nbsp; Pipeline: ${pipeline} &nbsp;·&nbsp; ${stage}
</span></td></tr>
<tr><td style="background:#0f1524;padding:16px 32px;border-left:1px solid #1e2a45;border-right:1px solid #1e2a45;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#141929;border:1px solid #1e2a45;border-radius:12px;">
<tr><td style="padding:20px 24px;border-bottom:1px solid #1e2433;">
<p style="margin:0 0 4px;font-size:12px;color:#8b9bb4;">LEAD</p>
<h2 style="margin:0;font-size:20px;color:#ffffff;">${lead.name}</h2>
</td></tr>
${lead.phone ? `<tr><td style="padding:12px 24px;border-bottom:1px solid #1e2433;"><span style="color:#8b9bb4;font-size:13px;">📱 WhatsApp: </span><a href="https://wa.me/55${(lead.phone||'').replace(/\D/g,'')}" style="color:#25D366;font-size:14px;font-weight:600;text-decoration:none;">${lead.phone}</a></td></tr>` : ''}
${lead.email ? `<tr><td style="padding:12px 24px;border-bottom:1px solid #1e2433;"><span style="color:#8b9bb4;font-size:13px;">✉️ E-mail: </span><span style="color:#e2e8f0;">${lead.email}</span></td></tr>` : ''}
${lead.sector ? `<tr><td style="padding:12px 24px;border-bottom:1px solid #1e2433;"><span style="color:#8b9bb4;font-size:13px;">🏢 Setor: </span><span style="color:#e2e8f0;">${lead.sector}</span></td></tr>` : ''}
${lead.revenue_text ? `<tr><td style="padding:12px 24px;border-bottom:1px solid #1e2433;"><span style="color:#8b9bb4;font-size:13px;">💰 Faturamento: </span><span style="color:#4ade80;font-weight:600;">${lead.revenue_text}</span></td></tr>` : ''}
${lead.pain_point ? `<tr><td style="padding:12px 24px;"><span style="color:#8b9bb4;font-size:13px;">🎯 Principal Dor: </span><span style="color:#e2e8f0;">${lead.pain_point}</span></td></tr>` : ''}
</table></td></tr>
${formAnswersHTML ? `<tr><td style="background:#0f1524;padding:16px 32px 8px;border-left:1px solid #1e2a45;border-right:1px solid #1e2a45;"><p style="margin:0 0 8px;font-size:11px;color:#8b9bb4;text-transform:uppercase;">Respostas do Formulário</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#141929;border:1px solid #1e2a45;border-radius:12px;">${formAnswersHTML}</table></td></tr>` : ''}
<tr><td style="background:#0f1524;padding:24px 32px;border-left:1px solid #1e2a45;border-right:1px solid #1e2a45;text-align:center;">
<a href="https://os.nghub.com.br" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#b8962e);color:#0a0e1a;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">⚡ Abrir CRM e Ver Lead</a>
</td></tr>
<tr><td style="background:#0a0e1a;border:1px solid #1e2a45;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
<p style="margin:0;font-size:12px;color:#4a5568;">Enviado automaticamente pelo NGHUB OS</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}
