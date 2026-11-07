import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://xvmnouioezqxcomughci.supabase.co';
const defaultAnonKey = 'sb_publishable_bNJhssq-2DVA4h1R56wcIQ_lkB66IvT';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
