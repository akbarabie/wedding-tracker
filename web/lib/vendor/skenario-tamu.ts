import type { EstimasiKonsumsi } from '@/lib/tamu/hitung'
import { ISTILAH_TAMU } from '@/lib/tamu/istilah'
import type { Satuan } from './label'

// Jembatan antara daftar tamu dan perbandingan vendor (Fase C). Semua fungsi di sini
// murni. Angka tamu selalu dalam orang (kepala), sama dengan satuan "tamu (pax)" vendor.

export type KunciTamu = 'pasti' | 'perkiraan' | 'maksimum'

export type PilihanTamu = {
  kunci: KunciTamu
  nilai: number
  label: string
}

const LABEL_PILIHAN: Record<KunciTamu, string> = {
  pasti: ISTILAH_TAMU.pasti.nama,
  perkiraan: ISTILAH_TAMU.mungkin.nama,
  maksimum: ISTILAH_TAMU.maksimal.nama,
}

// Jumlah tamu yang dipakai bila pengguna belum memilih sendiri. Perkiraan hadir
// lebih mendekati kebutuhan nyata daripada total undangan. Bila perkiraan belum bisa
// dihitung (belum ada tamu yang menjawab tegas) atau hasilnya nol, dipakai batas atas.
// Mengembalikan null bila tidak ada tamu sama sekali, karena nol bukan skenario.
export function tamuBawaan(e: EstimasiKonsumsi): PilihanTamu | null {
  if (e.perkiraan !== null && e.perkiraan > 0) {
    return { kunci: 'perkiraan', nilai: e.perkiraan, label: LABEL_PILIHAN.perkiraan }
  }
  if (e.maksimum > 0) {
    return { kunci: 'maksimum', nilai: e.maksimum, label: LABEL_PILIHAN.maksimum }
  }
  return null
}

// Pilihan cepat di bawah kolom jumlah tamu: pasti, perkiraan, dan batas atas.
// Pilihan dengan nilai nol dibuang, dan pilihan yang nilainya sama dengan pilihan
// sebelumnya dilewati supaya tidak ada tombol kembar.
export function daftarPilihanTamu(e: EstimasiKonsumsi): PilihanTamu[] {
  const kandidat: PilihanTamu[] = [
    { kunci: 'pasti', nilai: e.pasti, label: LABEL_PILIHAN.pasti },
  ]
  if (e.perkiraan !== null) {
    kandidat.push({ kunci: 'perkiraan', nilai: e.perkiraan, label: LABEL_PILIHAN.perkiraan })
  }
  kandidat.push({ kunci: 'maksimum', nilai: e.maksimum, label: LABEL_PILIHAN.maksimum })

  const hasil: PilihanTamu[] = []
  for (const k of kandidat) {
    if (k.nilai <= 0) continue
    if (hasil.some((h) => h.nilai === k.nilai)) continue
    hasil.push(k)
  }
  return hasil
}

// Skenario efektif untuk halaman Bandingkan. Jumlah tamu diisi otomatis hanya bila
// pengguna belum menyentuh kolomnya (kunci tamu tidak ada di URL). Kolom yang sengaja
// dikosongkan atau diisi sendiri dihormati apa adanya.
export function terapkanTamuBawaan(
  nilai: Partial<Record<Satuan, number>>,
  tamuAdaDiUrl: boolean,
  estimasi: EstimasiKonsumsi | null
): { nilai: Partial<Record<Satuan, number>>; bawaan: PilihanTamu | null } {
  if (tamuAdaDiUrl || estimasi === null) return { nilai, bawaan: null }
  const bawaan = tamuBawaan(estimasi)
  if (bawaan === null) return { nilai, bawaan: null }
  return { nilai: { ...nilai, tamu: bawaan.nilai }, bawaan }
}
