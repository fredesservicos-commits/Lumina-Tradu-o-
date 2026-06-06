import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wctxqtmcnqvtjqhwuwql.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdHhxdG1jbnF2dGpxaHd1d3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2OTM5ODYsImV4cCI6MjA5NjI2OTk4Nn0.tG9drqBaQnHSWPUaiPlpFqElPd3pR4dexoX8ZfiHB_s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
