
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qsvabiflvypinzwbdlhx.supabase.co';
const supabaseKey = 'sb_publishable_0Pn9XTk7whN2pD1GEbMu_g_Rv_EHsL_';

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditPipelines() {
    console.log('--- Auditing Pipelines and Lead Visibility ---');
    
    try {
        const { data, error } = await supabase.from('leads').select('name, pipeline, stage, created_at');
        if (error) throw error;

        const pipelines = {};
        const orphans = [];

        data?.forEach(l => {
            const p = l.pipeline || 'SEM_PIPELINE';
            pipelines[p] = (pipelines[p] || 0) + 1;
            if (!l.pipeline) orphans.push(l.name);
        });

        console.log('Leads per Pipeline:', pipelines);
        if (orphans.length > 0) {
            console.log('\nLeads without pipeline (might be hidden if filter is active):');
            orphans.forEach(name => console.log(`- ${name}`));
        }

        // Check for common stages that might be confusing
        const stageNames = {};
        data?.forEach(l => {
            stageNames[l.stage] = (stageNames[l.stage] || 0) + 1;
        });
        console.log('\nLeads per Stage:', stageNames);

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

auditPipelines();
