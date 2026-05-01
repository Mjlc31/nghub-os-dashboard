import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// ─── Clientes ──────────────────────────────────────────────────────────────────
const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Remetente padrão (domínio verificado no Resend)
//     Enquanto o domínio não estiver verificado, use: onboarding@resend.dev
//     Após verificar os.nghub.com.br no Resend, mude para: notificacoes@os.nghub.com.br
const FROM_EMAIL = 'NGHUB OS <notificacoes@os.nghub.com.br>';

// ─── Template de E-mail HTML ──────────────────────────────────────────────────
function buildEmailHTML(lead: Record<string, any>): string {
    const origin = lead.origin || 'Direto';
    const pipeline = lead.pipeline || 'Geral';
    const stage = lead.stage || 'Novo Lead';

    const formAnswersHTML = lead.form_answers
        ? Object.entries(lead.form_answers as Record<string, any>)
            .filter(([, v]) => v !== null && v !== '' && v !== undefined)
            .map(([k, v]) => `
            <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #1e2433;color:#8b9bb4;font-size:13px;text-transform:capitalize;">${k.replace(/_/g, ' ')}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #1e2433;color:#e2e8f0;font-size:13px;">${v}</td>
            </tr>`).join('')
        : '';

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Novo Lead - NGHUB OS</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e1a;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1f35 0%,#0f1524 100%);border-radius:16px 16px 0 0;padding:32px;text-align:center;border:1px solid #1e2a45;border-bottom:none;">
            <div style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#f0cc60);padding:2px;border-radius:50%;margin-bottom:16px;">
              <div style="background:#0a0e1a;border-radius:50%;width:48px;height:48px;display:flex;align-items:center;justify-content:center;line-height:52px;text-align:center;">
                <span style="font-size:24px;">🎯</span>
              </div>
            </div>
            <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Novo Lead Capturado!</h1>
            <p style="margin:0;font-size:14px;color:#8b9bb4;">NGHUB OS • Sistema CRM</p>
          </td>
        </tr>

        <!-- Badge de Origem -->
        <tr>
          <td style="background:#0f1524;border-left:1px solid #1e2a45;border-right:1px solid #1e2a45;padding:16px 32px;text-align:center;">
            <span style="display:inline-block;background:linear-gradient(135deg,rgba(212,175,55,0.15),rgba(212,175,55,0.05));border:1px solid rgba(212,175,55,0.4);color:#D4AF37;font-size:12px;font-weight:600;padding:6px 16px;border-radius:100px;text-transform:uppercase;letter-spacing:1px;">
              📌 ${origin} &nbsp;·&nbsp; Pipeline: ${pipeline} &nbsp;·&nbsp; ${stage}
            </span>
          </td>
        </tr>

        <!-- Card Principal do Lead -->
        <tr>
          <td style="background:#0f1524;padding:0 32px 8px;border-left:1px solid #1e2a45;border-right:1px solid #1e2a45;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#141929;border:1px solid #1e2a45;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:20px 24px;border-bottom:1px solid #1e2a45;">
                  <p style="margin:0 0 4px;font-size:12px;color:#8b9bb4;text-transform:uppercase;letter-spacing:1px;">LEAD</p>
                  <h2 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${lead.name || 'Sem nome'}</h2>
                </td>
              </tr>
              ${lead.phone ? `
              <tr>
                <td style="padding:12px 24px;border-bottom:1px solid #1e2433;">
                  <span style="color:#8b9bb4;font-size:13px;">📱 WhatsApp: </span>
                  <a href="https://wa.me/55${(lead.phone || '').replace(/\D/g,'')}" style="color:#25D366;font-size:14px;font-weight:600;text-decoration:none;">${lead.phone}</a>
                </td>
              </tr>` : ''}
              ${lead.email ? `
              <tr>
                <td style="padding:12px 24px;border-bottom:1px solid #1e2433;">
                  <span style="color:#8b9bb4;font-size:13px;">✉️ E-mail: </span>
                  <span style="color:#e2e8f0;font-size:14px;">${lead.email}</span>
                </td>
              </tr>` : ''}
              ${lead.instagram ? `
              <tr>
                <td style="padding:12px 24px;border-bottom:1px solid #1e2433;">
                  <span style="color:#8b9bb4;font-size:13px;">📸 Instagram: </span>
                  <a href="https://instagram.com/${lead.instagram.replace('@','')}" style="color:#E1306C;font-size:14px;font-weight:500;text-decoration:none;">${lead.instagram}</a>
                </td>
              </tr>` : ''}
              ${lead.sector ? `
              <tr>
                <td style="padding:12px 24px;border-bottom:1px solid #1e2433;">
                  <span style="color:#8b9bb4;font-size:13px;">🏢 Setor: </span>
                  <span style="color:#e2e8f0;font-size:14px;">${lead.sector}</span>
                </td>
              </tr>` : ''}
              ${lead.revenue_text ? `
              <tr>
                <td style="padding:12px 24px;border-bottom:1px solid #1e2433;">
                  <span style="color:#8b9bb4;font-size:13px;">💰 Faturamento: </span>
                  <span style="color:#4ade80;font-size:14px;font-weight:600;">${lead.revenue_text}</span>
                </td>
              </tr>` : ''}
              ${lead.headcount ? `
              <tr>
                <td style="padding:12px 24px;border-bottom:1px solid #1e2433;">
                  <span style="color:#8b9bb4;font-size:13px;">👥 Time: </span>
                  <span style="color:#e2e8f0;font-size:14px;">${lead.headcount}</span>
                </td>
              </tr>` : ''}
              ${lead.pain_point ? `
              <tr>
                <td style="padding:12px 24px;">
                  <span style="color:#8b9bb4;font-size:13px;">🎯 Principal Dor: </span>
                  <span style="color:#e2e8f0;font-size:14px;">${lead.pain_point}</span>
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>

        <!-- Respostas do Formulário (se houver) -->
        ${formAnswersHTML ? `
        <tr>
          <td style="background:#0f1524;padding:16px 32px 8px;border-left:1px solid #1e2a45;border-right:1px solid #1e2a45;">
            <p style="margin:0 0 8px;font-size:11px;color:#8b9bb4;text-transform:uppercase;letter-spacing:1px;">Respostas do Formulário</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#141929;border:1px solid #1e2a45;border-radius:12px;overflow:hidden;">
              ${formAnswersHTML}
            </table>
          </td>
        </tr>` : ''}

        <!-- CTA Button -->
        <tr>
          <td style="background:#0f1524;padding:24px 32px;border-left:1px solid #1e2a45;border-right:1px solid #1e2a45;text-align:center;">
            <a href="https://os.nghub.com.br" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#b8962e);color:#0a0e1a;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.5px;">
              ⚡ Abrir CRM e Ver Lead
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0a0e1a;border:1px solid #1e2a45;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#4a5568;">Enviado automaticamente pelo NGHUB OS</p>
            <p style="margin:0;font-size:11px;color:#2d3748;">Você está recebendo esta notificação por ser vendedor cadastrado.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── Handler Principal ────────────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Segurança básica: validar secret no header
    const secret = req.headers['x-notification-secret'];
    if (process.env.NOTIFICATION_SECRET && secret !== process.env.NOTIFICATION_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // O Supabase Database Webhook envia o registro em: { record: {...}, type: "INSERT", ... }
        const record = req.body?.record || req.body;

        if (!record || !record.name) {
            return res.status(400).json({ error: 'Payload inválido: campo name ausente' });
        }

        // 1. Buscar todos os vendedores com e-mail cadastrado
        const { data: sellers, error: sellersError } = await supabase
            .from('sellers')
            .select('id, name, email')
            .not('email', 'is', null)
            .neq('email', '');

        if (sellersError) {
            console.error('Erro ao buscar vendedores:', sellersError);
            return res.status(500).json({ error: 'Erro ao buscar vendedores' });
        }

        if (!sellers || sellers.length === 0) {
            console.log('Nenhum vendedor com e-mail cadastrado. Notificação ignorada.');
            return res.status(200).json({ message: 'Nenhum vendedor para notificar', sent: 0 });
        }

        const recipientEmails = sellers.map((s: any) => s.email as string);
        const leadName = record.name || 'Novo Lead';
        const htmlContent = buildEmailHTML(record);

        // 2. Disparar o e-mail para todos os vendedores de uma vez
        const { data: emailData, error: emailError } = await resend.emails.send({
            from: FROM_EMAIL,
            to: recipientEmails,
            subject: `🎯 Novo Lead: ${leadName} • NGHUB OS`,
            html: htmlContent,
        });

        if (emailError) {
            console.error('Erro ao enviar e-mail via Resend:', emailError);
            return res.status(500).json({ error: 'Falha no envio do e-mail', details: emailError });
        }

        console.log(`✅ Notificação enviada para ${recipientEmails.length} vendedor(es):`, recipientEmails);

        return res.status(200).json({
            message: 'Notificações enviadas com sucesso',
            sent: recipientEmails.length,
            recipients: recipientEmails,
            emailId: emailData?.id,
        });

    } catch (err: any) {
        console.error('Erro fatal na notificação de lead:', err);
        return res.status(500).json({ error: 'Erro interno', details: err.message });
    }
}
