// Pesan dari trigger dan fungsi database kita sendiri (kode P0001) sudah berbahasa
// Indonesia dan tidak memuat data pribadi, jadi aman ditampilkan ke pengguna.
// Galat database lain disembunyikan dan diganti pesan cadangan.
export function pesanGalat(
  error: { code?: string; message: string },
  cadangan: string
): string {
  return error.code === 'P0001' ? error.message : cadangan
}
