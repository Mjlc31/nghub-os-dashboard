const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function testCreateEvent() {
    console.log("Creating test event...");
    const { error } = await supabase.from('events').insert([{
        title: "Test Event",
        date: new Date().toISOString(),
        location: "Test Location",
        capacity: 100,
        price: 50,
        image_url: 'https://picsum.photos/seed/test/800/400',
        attendees_count: 0,
        status: 'upcoming'
    }]);
        
    if (error) {
        console.error("❌ Erro ao criar evento:", error.message, error.details, error.hint);
    } else {
        console.log("✅ Event created successfully!");
    }
}
testCreateEvent();
