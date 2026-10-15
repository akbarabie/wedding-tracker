import { createClient } from '@/lib/supabase/server'

// Bentuk data pernikahan yang dibaca dari tabel weddings
export type Pernikahan = {
  id: string
  nama_pasangan: string
  tanggal_hari_h: string | null
  budget_total_resepsi: number
}

export type UndanganTertunda = {
  id: string
  created_at: string
  expires_at: string
}

// Mengambil pernikahan aktif milik pengguna yang sedang login.
// RLS pada tabel weddings sudah membatasi hasil hanya untuk pernikahan
// yang diikuti pengguna. Untuk MVP satu pengguna dianggap punya satu
// pernikahan aktif, jadi bila ada lebih dari satu diambil yang terbaru.
//
// Galat database sengaja dilempar, bukan dikembalikan sebagai null.
// Bila dianggap null, pengguna yang sebenarnya sudah punya pernikahan
// akan diarahkan ke halaman mulai dan bisa membuat pernikahan ganda.
export async function ambilPernikahanAktif(): Promise<Pernikahan | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weddings')
    .select('id, nama_pasangan, tanggal_hari_h, budget_total_resepsi')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[ambilPernikahanAktif] gagal, kode:', error.code)
    throw new Error('Gagal membaca data pernikahan')
  }

  return (data as Pernikahan | null) ?? null
}

// Mengambil undangan yang masih berlaku untuk email pengguna.
// Kegagalan di sini tidak fatal: pengguna tetap bisa membuat pernikahan baru,
// jadi galat hanya dicatat lalu daftar kosong dikembalikan.
export async function ambilUndanganTertunda(
  email: string
): Promise<UndanganTertunda[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('wedding_invitations')
    .select('id, created_at, expires_at')
    .eq('status', 'pending')
    .eq('email', email.toLowerCase())
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[ambilUndanganTertunda] gagal, kode:', error.code)
    return []
  }

  return (data as UndanganTertunda[]) ?? []
}
