import { buatKlienAdmin } from '@/lib/supabase/admin'

export type StatusEmail = 'tidak_ada' | 'belum_verifikasi' | 'terverifikasi'

const NILAI_VALID: readonly StatusEmail[] = [
  'tidak_ada',
  'belum_verifikasi',
  'terverifikasi',
]

// Memeriksa apakah sebuah email sudah terdaftar di Supabase Auth.
// Galat dilempar (bukan dianggap "tidak ada") supaya kegagalan database tidak
// salah dibaca sebagai email baru, yang bisa memicu pendaftaran ganda.
export async function cekStatusEmail(email: string): Promise<StatusEmail> {
  const admin = buatKlienAdmin()
  const { data, error } = await admin.rpc('status_email', { p_email: email })

  if (error) {
    // Hanya kode galat yang dicatat, email pengguna tidak ikut masuk log
    console.error('[cekStatusEmail] gagal, kode:', error.code)
    throw new Error('Gagal memeriksa status email')
  }

  if (!NILAI_VALID.includes(data as StatusEmail)) {
    throw new Error('Respons status email tidak dikenali')
  }
  return data as StatusEmail
}
