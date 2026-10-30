import dns from 'dns';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Force IPv4 resolution first in Node.js to prevent 30s-90s IPv6 connection timeouts on Windows
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // ignore if unsupported
}

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
  process.env.SUPABASE_URL &&
    !process.env.SUPABASE_URL.includes('your-supabase-project.supabase.co') &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('your-supabase-service-role-key')
);

/**
 * Custom fetch wrapper with a strict 3.5-second timeout so slow/unreachable network calls
 * never hang the Express server or trigger Vite proxy empty-JSON timeouts.
 */
export const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    return await fetch(input, {
      ...init,
      signal: init?.signal || controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Service Role Supabase Client for backend administrative operations,
 * background pipelines, storage ingestion, and migration execution.
 */
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Creates a stateless Supabase client with the 3.5-second timeout fetch wrapper.
 */
export function createStatelessSupabaseClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: {
      fetch: fetchWithTimeout,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a request-scoped Supabase client enforcing Row Level Security (RLS)
 * for the authenticated user's JWT token.
 */
export function createAuthenticatedSupabaseClient(jwtToken?: string): SupabaseClient {
  if (!jwtToken) {
    return supabaseAdmin;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: fetchWithTimeout,
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
