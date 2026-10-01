import { createBrowserClient } from '@supabase/ssr'

// Klien Supabase untuk Client Component (berjalan di browser).
// Memakai publishable key, aman di browser karena semua akses tunduk pada RLS.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}