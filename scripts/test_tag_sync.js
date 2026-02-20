// Debug script to check if the tag syncs with the transaction correctly
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
let supabaseUrl = ''; let supabaseKey = '';
envContent.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSync() {
    // 1. Get an event with a price
    const { data: events } = await supabase.from('events').select('id, title, price').limit(1);
    if (!events || events.length === 0) return console.error('No events found');
    const event = events[0];
    console.log(`Using event: ${event.title} (Price: ${event.price})`);

    // 2. Create a Lead
    const lead = { name: 'Test Sync Revenue', stage: 'Novo Lead', value: 0 };
    const { data: leadData } = await supabase.from('leads').insert([lead]).select();
    const leadId = leadData[0].id;
    console.log(`Created lead: ${leadId}`);

    // 3. Update the lead's tag
    await supabase.from('leads').update({ tag_id: event.id, value: event.price }).eq('id', leadId);
    console.log(`Updated lead with tag ${event.id} and value ${event.price}`);

    // 4. Move lead to WON
    await supabase.from('leads').update({ stage: 'Venda Fechada' }).eq('id', leadId);
    // Simulate frontend logic:
    await supabase.from('transactions').insert([{ description: `Venda: ${leadData[0].name}`, amount: event.price, type: 'income', category: 'CRM', date: new Date().toISOString() }]);
    console.log('Moved to Venda Fechada and created transaction');

    // 5. Verify transaction
    const { data: tx } = await supabase.from('transactions').select('*').eq('description', `Venda: ${leadData[0].name}`);
    console.log('Transaction found:', tx);

    // Cleanup
    await supabase.from('leads').delete().eq('id', leadId);
    await supabase.from('transactions').delete().eq('description', `Venda: ${leadData[0].name}`);
}

testSync();
