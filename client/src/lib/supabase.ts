import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient;
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars missing – using dummy client for UI preview');
  // Dummy values so createClient does not throw; these won't connect to a real backend.
  const dummyUrl = 'https://example.com';
  const dummyKey = 'anon';
  supabase = createClient(dummyUrl, dummyKey);
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

