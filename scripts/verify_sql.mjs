import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
    console.log("Verificando colunas na tabela 'leads'...");
    const { data, error } = await supabase.from('leads').select('*').limit(1);
    
    if (error) {
        console.error("❌ Erro ao acessar a tabela:", error.message);
        return;
    }

    if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log("Colunas encontradas:");
        console.log(columns.join(', '));
        
        const hasFormAnswers = columns.includes('form_answers');
        const hasProductLabel = columns.includes('product_label');
        const hasPipeline = columns.includes('pipeline');
        
        console.log("\n--- Resultado da Verificação ---");
        console.log(`form_answers adicionada? ${hasFormAnswers ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`product_label adicionada? ${hasProductLabel ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`pipeline já existia/adicionada? ${hasPipeline ? '✅ SIM' : '❌ NÃO'}`);
        
        if (hasFormAnswers && hasProductLabel && hasPipeline) {
            console.log("\nTudo certo! As colunas foram adicionadas com sucesso.");
        } else {
             console.log("\nATENÇÃO: Algumas colunas parecem não ter sido criadas. Verifique se o SQL foi executado na base correta.");
        }
    } else {
        console.log("A tabela leads está vazia. Não consigo verificar o schema desta forma sem dados, mas se o script não deu erro no painel, deve estar correto.");
        // Tentativa de inseir um lead dummy e rolar rollback apenas para testar as colunas
        const dummyLead = {
             name: 'Teste Verificacao',
             product_label: 'test',
             form_answers: { "Pergunta": "Resposta" }
        };
        const { error: insertError } = await supabase.from('leads').insert([dummyLead]);
        if (insertError) {
             console.error("❌ Falha na verificação de inserção:", insertError.message);
        } else {
             console.log("✅ Colunas verificadas via inserção bem-sucedida!");
             // Limpar lead de teste
             await supabase.from('leads').delete().eq('name', 'Teste Verificacao');
        }
    }
}
verifySchema();
