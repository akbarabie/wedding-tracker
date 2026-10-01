// Bentuk status yang dikembalikan Server Action ke komponen form.
export type StatusForm = {
  // Galat umum dari server, misalnya kredensial salah
  galat?: string
  // Galat per kolom hasil validasi, kuncinya nama kolom
  galatField?: Record<string, string>
  // Isi kolom non sensitif agar tidak hilang saat form gagal.
  // Kata sandi tidak pernah dikembalikan ke browser.
  nilaiLama?: Record<string, string>
}