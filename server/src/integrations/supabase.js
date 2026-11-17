import { createClient } from "@supabase/supabase-js"

import { config } from "#src/config/env.js"

/*
 * Supabase is used purely as a Postgres client (no Supabase Auth, no sessions),
 * so one client per key is shared for the whole process.
 */

const CLIENT_OPTIONS = { auth: { autoRefreshToken: false, persistSession: false } }

let dbClient = null
let adminClient = null

/** Anon-key client: what most Next.js API routes use today (lib/supabase/server.ts). */
export function createDbClient() {
  if (dbClient) return dbClient
  const { url, anonKey } = config.supabase
  if (!url || !anonKey) throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_ANON_KEY)")
  dbClient = createClient(url, anonKey, CLIENT_OPTIONS)
  return dbClient
}

/** Service-role client: bypasses RLS. Server-only (lib/supabase/admin.ts). */
export function createAdminClient() {
  if (adminClient) return adminClient
  const { url, serviceRoleKey } = config.supabase
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin client is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)")
  }
  adminClient = createClient(url, serviceRoleKey, CLIENT_OPTIONS)
  return adminClient
}

/** Service-role client when the key is configured, otherwise the anon client. */
export function createPreferredClient() {
  return config.supabase.serviceRoleKey ? createAdminClient() : createDbClient()
}
