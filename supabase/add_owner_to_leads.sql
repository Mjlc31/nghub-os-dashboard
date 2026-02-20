-- Run this query in your Supabase SQL Editor
-- This script adds the owner_id column to the leads table and links it to the profiles table

ALTER TABLE public.leads
ADD COLUMN owner_id UUID REFERENCES public.profiles(id) DEFAULT NULL;

-- If you want to index it for faster queries:
CREATE INDEX idx_leads_owner_id ON public.leads(owner_id);
