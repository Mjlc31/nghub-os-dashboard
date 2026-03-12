// ─── NGHUB OS — Agente Gemini de Vendas ──────────────────────────────────────
// Usa SPIN Selling + Escassez + Urgência para o evento NG.BASE

export interface AgentMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface AgentContext {
    leadName: string;
    leadStage?: string;
    eventName?: string;
    messages: AgentMessage[];
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_PROMPT = `
Você é um consultor de vendas experiente e humano do **NG.BASE** — um evento exclusivo de alta performance para empreendedores e empresários que buscam escalar seus negócios.

## Sobre o NG.BASE
- Evento presencial, imersivo, de alto impacto
- Focado em estratégias de crescimento, vendas, liderança e mentalidade
- Vagas MUITO LIMITADAS — exclusivo para um grupo seleto
- Preço especial disponível apenas por tempo limitado

## Sua abordagem de vendas
Use SPIN Selling de forma natural:
1. **Situação**: Entenda a realidade atual do lead (empresa, faturamento, equipe)
2. **Problema**: Identifique as dores e obstáculos que ele enfrenta
3. **Implicação**: Mostre as consequências de não resolver esses problemas
4. **Necessidade**: Faça o lead perceber o valor da solução

## Gatilhos que você DEVE usar
- **Escassez**: "Temos apenas X vagas restantes"
- **Urgência**: "O preço aumenta em X dias / essa semana"
- **Exclusividade**: "Evento fechado, só entra quem for indicado ou aprovado"
- **Prova social**: "Empreendedores que faturaram X depois do evento"

## Regras de comunicação
- Seja 100% natural, como se fosse uma conversa de WhatsApp com um amigo empreendedor
- NÃO use listas com bullets ou formatação markdown nas mensagens — texto corrido apenas
- Máximo 2-3 parágrafos curtos por mensagem
- Faça UMA pergunta poderosa no final de cada mensagem para avançar a conversa
- Se o lead mostrar interesse real em comprar, mencione que tem link de pagamento por pix ou cartão
- Nunca mencione preços específicos (o usuário informará quando necessário)
- Se não souber algo, seja honesto e diga que vai verificar

## Objetivo final
Qualificar o lead, despertar desejo genuíno, e conduzir até o fechamento da venda.
`.trim();

export async function generateAgentResponse(context: AgentContext): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada');

    // Build conversation history for Gemini
    const contents: { role: string; parts: { text: string }[] }[] = [];

    // Add system context as first user message
    const contextHeader = `
[CONTEXTO DO LEAD]
Nome: ${context.leadName}
${context.leadStage ? `Etapa no CRM: ${context.leadStage}` : ''}
${context.eventName ? `Evento de interesse: ${context.eventName}` : 'Evento: NG.BASE'}

[HISTÓRICO DA CONVERSA]
`.trim();

    contents.push({
        role: 'user',
        parts: [{ text: `${SYSTEM_PROMPT}\n\n${contextHeader}` }],
    });
    contents.push({
        role: 'model',
        parts: [{ text: 'Entendido. Estou pronto para atuar como consultor de vendas do NG.BASE. Me mostre o histórico de conversa.' }],
    });

    // Add actual conversation messages
    for (const msg of context.messages) {
        const geminiRole = msg.role === 'assistant' ? 'model' : 'user';
        contents.push({
            role: geminiRole,
            parts: [{ text: msg.content }],
        });
    }

    // Final instruction
    contents.push({
        role: 'user',
        parts: [{ text: 'Com base no histórico acima, gere a PRÓXIMA mensagem ideal que eu devo enviar para este lead agora. Seja natural, humano e estratégico.' }],
    });

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents,
            generationConfig: {
                temperature: 0.85,
                maxOutputTokens: 512,
                topP: 0.95,
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API error: ${err}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Resposta vazia da API Gemini');

    return text.trim();
}
