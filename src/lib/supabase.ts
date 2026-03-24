import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hyrqurmgizivrzddxunj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gZc2nOSlvXQWUVrrzuYbuA_7XSxgwLk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
