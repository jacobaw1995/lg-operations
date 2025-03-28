import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,         // Ensure session is persisted
    autoRefreshToken: true,       // Refresh tokens automatically
    detectSessionInUrl: false,    // No OAuth redirects in this app
    storage: localStorage,        // Use localStorage for session data
    storageKey: 'sb-auth-token'   // Custom key for storage
  }
});