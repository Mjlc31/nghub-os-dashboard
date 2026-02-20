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

async function testConnection() {
    console.log('\n--- 1. Testing READ (Select) ---');
    const { data: readData, error: readError } = await supabase
        .from('leads')
        .select('*')
        .limit(1);

    if (readError) {
        console.error('❌ READ Failed:', readError.message);
        if (readError.code === 'PGRST301') console.error('   -> Hint: RLS policy might be blocking reads.');
    } else {
        console.log('✅ READ Successful');
    }

    console.log('\n--- 2. Testing WRITE (Insert) ---');
    const testLead = {
        name: 'Test Setup Verification',
        email: 'test_verify@example.com',
        company: 'Tester Inc',
        stage: 'New Lead', // Ensure this matches your Enum/String validation
        value: 0
    };

    const { data: insertData, error: insertError } = await supabase
        .from('leads')
        .insert([testLead])
        .select();

    let createdId = null;

    if (insertError) {
        console.error('❌ WRITE Failed:', insertError.message);
        if (insertError.code === '42501') console.error('   -> Hint: RLS policy violation. Anonymous users cannot insert.');
    } else {
        console.log('✅ WRITE Successful');
        if (insertData && insertData.length > 0) {
            createdId = insertData[0].id;
            console.log(`   -> Created ID: ${createdId}`);
        }
    }

    if (createdId) {
        console.log('\n--- 3. Testing DELETE (Cleanup) ---');
        const { error: deleteError } = await supabase
            .from('leads')
            .delete()
            .eq('id', createdId);

        if (deleteError) {
            console.error('❌ DELETE Failed:', deleteError.message);
        } else {
            console.log('✅ DELETE Successful');
        }
    }
}

testConnection();
