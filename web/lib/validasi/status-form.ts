// Bentuk status yang dikembalikan Server Action ke komponen form.
export type StatusForm = {
  // Galat umum dari server, misalnya kredensial salah
  galat?: string
  // Pesan informasi yang bukan galat, misalnya "tautan verifikasi sudah dikirim"
  info?: string
  // Galat per kolom hasil validasi, kuncinya nama kolom
  galatField?: Record<string, string>
  // Isi kolom non sensitif agar tidak hilang saat form gagal.
  // Kata sandi tidak pernah dikembalikan ke browser.
  nilaiLama?: Record<string, string>
}
