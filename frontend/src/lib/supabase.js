import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configured = Boolean(url && key);

// Falls back to dummy values so the page still opens and can tell you what is missing
export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-key');
