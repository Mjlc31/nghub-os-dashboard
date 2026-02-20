const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
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
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
    console.log('Testing Supabase Auth (SignUp)...');

    const email = `test.auth.${Date.now()}@nghub.com.br`;
    const password = 'TestPassword123!';

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error('❌ Auth SignUp Failed:', error.message);
    } else {
        console.log('✅ Auth SignUp Successful');
        console.log('   -> User ID:', data.user?.id);
        console.log('   -> Email:', data.user?.email);
        console.log('   -> Note: You may need to delete this user manually from the Supabase dashboard if you want to clean up.');
    }
}

testAuth();
