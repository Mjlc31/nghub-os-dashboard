import { supabase } from './src/lib/supabase.js'; supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(5).then(({data}) =
