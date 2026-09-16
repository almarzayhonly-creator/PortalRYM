import { createClient } from '@supabase/supabase-js';
import backendConfig from '../config/backend.json';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || backendConfig.supabaseUrl;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || backendConfig.supabasePublishableKey;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Falta la configuracion publica de Supabase.');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
