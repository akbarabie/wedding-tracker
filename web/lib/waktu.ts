// Pembantu tanggal untuk timeline. Tanggal hari ini menurut WIB memakai hariIniWib
// dari lib/validasi/pernikahan.ts, jadi tidak diulang di sini.

const MS_PER_HARI = 86_400_000

// Selisih hari dari tanggal awal ke tanggal akhir (keduanya YYYY-MM-DD).
// Hasilnya positif bila tanggal akhir lebih lambat dari tanggal awal.
export function selisihHari(awal: string, akhir: string): number {
  const a = Date.parse(`${awal}T00:00:00Z`)
  const b = Date.parse(`${akhir}T00:00:00Z`)
  return Math.round((b - a) / MS_PER_HARI)
}
