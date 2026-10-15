import type { RingkasanKategori } from './kueri'

export type TingkatPeringatan = 'aman' | 'dekat' | 'lewat' | 'tanpa_rencana'

// Kuning mulai 80 persen dari rencana, merah di 100 persen atau lebih
const AMBANG_DEKAT = 0.8

export function tingkatPeringatan(
  komitmen: number,
  rencana: number
): TingkatPeringatan {
  if (rencana <= 0) return komitmen > 0 ? 'lewat' : 'tanpa_rencana'
  const rasio = komitmen / rencana
  if (rasio >= 1) return 'lewat'
  if (rasio >= AMBANG_DEKAT) return 'dekat'
  return 'aman'
}

export function labelPeringatan(
  tingkat: TingkatPeringatan,
  sisa: number
): string {
  if (tingkat === 'tanpa_rencana') return 'Belum ada rencana budget'
  if (tingkat === 'lewat') return sisa < 0 ? 'Melebihi budget' : 'Budget habis'
  if (tingkat === 'dekat') return 'Mendekati batas budget'
  return 'Masih aman'
}

const jumlah = (
  daftar: RingkasanKategori[],
  ambil: (k: RingkasanKategori) => number
) => daftar.reduce((total, k) => total + ambil(k), 0)

// Sisa budget resepsi dihitung dari komitmen kategori resepsi saja.
// Cincin, seserahan, dan mahar (di luar resepsi) dihitung terpisah.
export function hitungRingkasan(
  kategori: RingkasanKategori[],
  budgetResepsi: number
) {
  const resepsi = kategori.filter((k) => !k.di_luar_budget_resepsi)
  const luar = kategori.filter((k) => k.di_luar_budget_resepsi)

  const rencanaResepsi = jumlah(resepsi, (k) => k.nilai_rencana)
  const komitmenResepsi = jumlah(resepsi, (k) => k.total_komitmen)

  return {
    resepsi,
    luar,
    budgetResepsi,
    rencanaResepsi,
    komitmenResepsi,
    dibayarResepsi: jumlah(resepsi, (k) => k.total_dibayar),
    sisaResepsi: budgetResepsi - komitmenResepsi,
    // Peringatan bila rencana per kategori bila dijumlah melebihi budget total
    alokasiMelebihi: budgetResepsi > 0 && rencanaResepsi > budgetResepsi,
    // Selisih budget resepsi dengan jumlah rencana kategori resepsi.
    // Positif berarti masih ada budget yang belum dialokasikan.
    sisaAlokasi: budgetResepsi - rencanaResepsi,
    rencanaTotal: rencanaResepsi + jumlah(luar, (k) => k.nilai_rencana),
    rencanaLuar: jumlah(luar, (k) => k.nilai_rencana),
    komitmenLuar: jumlah(luar, (k) => k.total_komitmen),
    dibayarLuar: jumlah(luar, (k) => k.total_dibayar),
  }
}