import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Klien Supabase untuk Server Component, Server Action, dan Route Handler.
// Sesi pengguna dibaca dari cookie sehingga RLS berlaku atas nama pengguna yang login.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Dipanggil dari Server Component yang tidak boleh menulis cookie.
            // Aman diabaikan karena proxy yang bertugas menyegarkan sesi.
          }
        },
      },
    }
  )
}