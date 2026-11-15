import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\nMissing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Copy backend/.env.example to backend/.env and fill in both values.\n');
  process.exit(1);
}

// Uses the secret key, so it bypasses row level security. Our routes check permissions themselves.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
