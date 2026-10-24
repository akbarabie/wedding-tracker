// Kategori dan status RSVP tamu sesuai PRD 6.4. Nilainya harus sama dengan CHECK di tabel guests.
export const DAFTAR_KATEGORI_TAMU = ['keluarga', 'teman', 'kolega'] as const
export type KategoriTamu = (typeof DAFTAR_KATEGORI_TAMU)[number]

export const LABEL_KATEGORI_TAMU: Record<KategoriTamu, string> = {
  keluarga: 'Keluarga',
  teman: 'Teman',
  kolega: 'Kolega',
}

export const DAFTAR_STATUS_RSVP = [
  'belum_konfirmasi',
  'hadir',
  'tidak_hadir',
  'ragu',
] as const
export type StatusRsvp = (typeof DAFTAR_STATUS_RSVP)[number]

export const LABEL_STATUS_RSVP: Record<StatusRsvp, string> = {
  belum_konfirmasi: 'Belum dikonfirmasi',
  hadir: 'Hadir',
  tidak_hadir: 'Tidak hadir',
  ragu: 'Masih ragu',
}
