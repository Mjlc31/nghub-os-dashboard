-- Run this query in your Supabase SQL Editor
-- This script creates the new 'sellers' table and switches the leads owner_id dependency to it.

-- 1. Create Sellers Table
CREATE TABLE public.sellers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Optional, depending on your setup. If you want full access from the dashboard for now, leave it simple or create a permissive policy like your other tables)
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON public.sellers FOR ALL USING (true) WITH CHECK (true);

-- 2. Drop the old foreign key constraint from leads if it exists
-- The constraint name might vary, usually it's leads_owner_id_fkey
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_owner_id_fkey;

-- If you have existing data pointing to profiles that will now break, you might want to nullify or migrate first. 
-- Assuming it's safe to clear existing owners since this was just implemented and the ids were pointing to profiles:
UPDATE public.leads SET owner_id = NULL;

-- 3. Re-add the constraint pointing to sellers
ALTER TABLE public.leads
ADD CONSTRAINT leads_owner_id_fkey 
FOREIGN KEY (owner_id) 
REFERENCES public.sellers(id)
ON DELETE SET NULL;
