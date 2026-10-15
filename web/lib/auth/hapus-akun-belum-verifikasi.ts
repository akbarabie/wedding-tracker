import { buatKlienAdmin } from '@/lib/supabase/admin'

// Menghapus akun yang emailnya belum diverifikasi. Mengembalikan true bila ada
// akun yang benar-benar dihapus, false bila akunnya sudah tidak ada atau baru
// saja terverifikasi (dalam kasus itu tidak ada yang dihapus). Galat dilempar
// supaya pemanggil tidak melanjutkan pendaftaran dengan asumsi yang salah.
export async function hapusAkunBelumVerifikasi(email: string): Promise<boolean> {
  const admin = buatKlienAdmin()

  const { data: id, error } = await admin.rpc('id_akun_belum_verifikasi', {
    p_email: email,
  })

  if (error) {
    // Hanya kode galat yang dicatat, email pengguna tidak ikut masuk log
    console.error('[hapusAkunBelumVerifikasi] cari id gagal, kode:', error.code)
    throw new Error('Gagal mencari akun yang belum diverifikasi')
  }

  if (typeof id !== 'string') return false

  const { error: galatHapus } = await admin.auth.admin.deleteUser(id)
  if (galatHapus) {
    console.error('[hapusAkunBelumVerifikasi] hapus gagal, kode:', galatHapus.code)
    throw new Error('Gagal menghapus akun yang belum diverifikasi')
  }

  return true
}