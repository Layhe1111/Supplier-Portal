// lib/ppt/supabaseServer.js
// -----------------------------------------------------------------------------
// This file creates a server-only Supabase client.
// We use the SERVICE ROLE KEY here, so this file must NEVER be imported by
// browser/client code. Only import it from API routes or server-side modules.
// -----------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

export function getSupabaseAdminClient() {
  // Reuse one client instance between requests in the same server process.
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  }
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      // Worker/API routes do not use browser sessions.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}
