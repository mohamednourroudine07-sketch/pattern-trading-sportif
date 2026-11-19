import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

function isValidSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export const supabaseConfigurationIssue = !supabaseUrl
  ? 'missing-url'
  : !supabaseAnonKey
    ? 'missing-key'
    : !isValidSupabaseUrl(supabaseUrl)
      ? 'invalid-url'
      : null;

export const supabaseClient =
  supabaseUrl && supabaseAnonKey && isValidSupabaseUrl(supabaseUrl)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
