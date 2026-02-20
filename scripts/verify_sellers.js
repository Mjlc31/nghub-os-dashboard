const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local for local testing
const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        if (line.startsWith('VITE_SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1].trim();
        }
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
            supabaseKey = line.split('=')[1].trim();
        }
    });
}

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration in .env.local');
    process.exit(1);
}

console.log(`Checking connection to: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSellersIntegration() {
    console.log('\n--- 1. Testing READ (Select Sellers) ---');
    const { data: readData, error: readError } = await supabase
        .from('sellers')
        .select('*')
        .limit(1);

    if (readError) {
        console.error('❌ READ Failed:', readError.message);
    } else {
        console.log('✅ READ Successful');
    }

    console.log('\n--- 2. Testing WRITE (Insert Seller) ---');
    const testSeller = {
        name: 'Vendedor Teste Robot',
        phone: '11999999999'
    };

    const { data: insertData, error: insertError } = await supabase
        .from('sellers')
        .insert([testSeller])
        .select();

    let createdSellerId = null;

    if (insertError) {
        console.error('❌ WRITE Failed:', insertError.message);
    } else {
        console.log('✅ WRITE Successful');
        if (insertData && insertData.length > 0) {
            createdSellerId = insertData[0].id;
            console.log(`   -> Created Seller ID: ${createdSellerId}`);
        }
    }

    if (createdSellerId) {
        console.log('\n--- 3. Testing Lead Link (Insert Lead with Seller) ---');
        const testLead = {
            name: 'Lead do Vendedor Teste',
            company: 'Empresa Teste CRM UI',
            stage: 'New Lead',
            owner_id: createdSellerId,
            value: 0
        };

        const { data: leadData, error: leadError } = await supabase.from('leads').insert([testLead]).select();
        let createdLeadId = null;

        if (leadError) {
            console.error('❌ LEAD INSERT Failed:', leadError.message);
        } else {
            console.log('✅ LEAD INSERT (With Seller Link) Successful');
            if (leadData && leadData.length > 0) createdLeadId = leadData[0].id;
        }

        console.log('\n--- 4. Testing DELETE (Cleanup) ---');

        if (createdLeadId) {
            await supabase.from('leads').delete().eq('id', createdLeadId);
            console.log('   -> Test Lead Cleaned Up');
        }

        const { error: deleteError } = await supabase
            .from('sellers')
            .delete()
            .eq('id', createdSellerId);

        if (deleteError) {
            console.error('❌ SELLER DELETE Failed:', deleteError.message);
        } else {
            console.log('✅ SELLER DELETE Successful');
        }
    }
}

testSellersIntegration();
