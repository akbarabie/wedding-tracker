// Kategori dan status seserahan (Modul 3). Nilainya sama dengan CHECK di migrasi 17.
export const DAFTAR_KATEGORI_SESERAHAN = [
  'perlengkapan_ibadah',
  'perhiasan',
  'pakaian',
  'perawatan_diri',
  'aksesoris_fashion',
  'hobi_personal',
  'perlengkapan_rumah',
  'mahar',
] as const
export type KategoriSeserahan = (typeof DAFTAR_KATEGORI_SESERAHAN)[number]

export const LABEL_KATEGORI_SESERAHAN: Record<KategoriSeserahan, string> = {
  perlengkapan_ibadah: 'Perlengkapan Ibadah',
  perhiasan: 'Perhiasan',
  pakaian: 'Pakaian',
  perawatan_diri: 'Bodycare & Skincare / Perawatan Diri',
  aksesoris_fashion: 'Aksesoris & Fashion',
  hobi_personal: 'Hobi & Personal',
  perlengkapan_rumah: 'Perlengkapan Rumah / Tambahan',
  mahar: 'Mahar',
}

// Urutan alur belanja: perlu dibeli, lalu dipesan, lalu selesai
export const DAFTAR_STATUS_SESERAHAN = ['perlu_dibeli', 'dipesan', 'selesai'] as const
export type StatusSeserahan = (typeof DAFTAR_STATUS_SESERAHAN)[number]

export const LABEL_STATUS_SESERAHAN: Record<StatusSeserahan, string> = {
  perlu_dibeli: 'Perlu dibeli',
  dipesan: 'Sudah dipesan',
  selesai: 'Selesai',
}
