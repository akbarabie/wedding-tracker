import { createClient } from '@supabase/supabase-js'

// Klien dengan hak penuh (service_role) yang melewati RLS.
// Hanya boleh dipanggil dari Server Action atau Route Handler.
// Jangan pernah mengimpor berkas ini dari komponen client, dan jangan memberi
// awalan NEXT_PUBLIC pada SUPABASE_SECRET_KEY karena itu akan membocorkannya ke browser.
export function buatKlienAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const kunciRahasia = process.env.SUPABASE_SECRET_KEY

  if (!url || !kunciRahasia) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SECRET_KEY belum diatur')
  }

  return createClient(url, kunciRahasia, {
    // Klien ini tidak mewakili pengguna mana pun, jadi tidak menyimpan sesi
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
