// Status pemrosesan nota, sama dengan CHECK status_proses di tabel receipts
export const DAFTAR_STATUS_NOTA = ['menunggu', 'diproses', 'selesai', 'gagal'] as const
export type StatusNota = (typeof DAFTAR_STATUS_NOTA)[number]

export const LABEL_STATUS_NOTA: Record<StatusNota, string> = {
  menunggu: 'Menunggu diproses',
  diproses: 'Sedang dibaca',
  selesai: 'Selesai dibaca',
  gagal: 'Gagal dibaca',
}

// Warna chip status, selaras dengan palet status di halaman Tamu
export const KELAS_STATUS_NOTA: Record<StatusNota, string> = {
  menunggu: 'bg-[#F3EEEC] text-[#7A6A64]',
  diproses: 'bg-[#FBF3DC] text-[#8A6A22]',
  selesai: 'bg-[#E8F3EA] text-[#2E6B3A]',
  gagal: 'bg-[#FEF3F2] text-[#B42318]',
}

// Nota yang masih menunggu atau sedang dibaca berarti halaman perlu dimuat ulang berkala
export function masihBerjalan(status: StatusNota): boolean {
  return status === 'menunggu' || status === 'diproses'
}
