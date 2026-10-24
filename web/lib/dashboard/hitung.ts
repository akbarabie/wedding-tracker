import { selisihHari } from '@/lib/waktu'
import type { StatusRsvp } from '@/lib/tamu/label'
import type { RingkasanTamu } from '@/lib/tamu/hitung'

// Jendela "jatuh tempo" di dashboard menurut PRD 6.7: tujuh hari ke depan.
// Yang sudah lewat dan belum selesai ikut ditampilkan sebagai terlambat,
// karena justru itu yang paling perlu diperhatikan.
export const JENDELA_JATUH_TEMPO_HARI = 7

export type TugasMasukan = {
  id: string
  judul: string
  fase: number
  deadline: string | null
  selesai: boolean
}

export type TugasJatuhTempo = {
  id: string
  judul: string
  fase: number
  deadline: string
  // Negatif berarti sudah lewat
  sisaHari: number
}

// Tugas belum selesai yang deadline-nya sudah lewat atau jatuh dalam jendela.
// Urut dari yang paling mendesak, lalu judul supaya urutan stabil.
export function tugasJatuhTempo(
  tugas: TugasMasukan[],
  hariIni: string,
  jendela = JENDELA_JATUH_TEMPO_HARI
): TugasJatuhTempo[] {
  const hasil: TugasJatuhTempo[] = []
  for (const t of tugas) {
    if (t.selesai || !t.deadline) continue
    const sisaHari = selisihHari(hariIni, t.deadline)
    if (sisaHari > jendela) continue
    hasil.push({
      id: t.id,
      judul: t.judul,
      fase: t.fase,
      deadline: t.deadline,
      sisaHari,
    })
  }
  return hasil.sort(
    (a, b) =>
      a.sisaHari - b.sisaHari || a.judul.localeCompare(b.judul, 'id-ID')
  )
}

export type CicilanMasukan = {
  id: string
  label: string
  nominal: number
  jatuh_tempo: string
  dibayar_pada: string | null
}

export type PengeluaranBelumLunas = {
  id: string
  deskripsi: string | null
  vendors: { nama: string } | null
  payments: CicilanMasukan[]
}

export type PembayaranJatuhTempo = {
  id: string
  pengeluaranId: string
  vendor: string | null
  deskripsi: string | null
  label: string
  nominal: number
  jatuhTempo: string
  sisaHari: number
}

// Cicilan yang belum dibayar dan sudah lewat atau jatuh dalam jendela.
// Urut menurut jatuh tempo, lalu nominal terbesar dulu.
export function pembayaranJatuhTempo(
  pengeluaran: PengeluaranBelumLunas[],
  hariIni: string,
  jendela = JENDELA_JATUH_TEMPO_HARI
): PembayaranJatuhTempo[] {
  const hasil: PembayaranJatuhTempo[] = []
  for (const p of pengeluaran) {
    for (const c of p.payments ?? []) {
      if (c.dibayar_pada !== null) continue
      const sisaHari = selisihHari(hariIni, c.jatuh_tempo)
      if (sisaHari > jendela) continue
      hasil.push({
        id: c.id,
        pengeluaranId: p.id,
        vendor: p.vendors?.nama ?? null,
        deskripsi: p.deskripsi,
        label: c.label,
        // numeric dari database bisa tiba sebagai teks, jadi diubah ke angka
        nominal: Number(c.nominal),
        jatuhTempo: c.jatuh_tempo,
        sisaHari,
      })
    }
  }
  return hasil.sort(
    (a, b) => a.sisaHari - b.sisaHari || b.nominal - a.nominal
  )
}

export function totalNominal(daftar: { nominal: number }[]): number {
  return daftar.reduce((total, d) => total + d.nominal, 0)
}

// Teks sisa hari untuk penanda di daftar jatuh tempo
export function labelSisaHari(sisaHari: number): string {
  if (sisaHari < 0) return `Terlambat ${Math.abs(sisaHari)} hari`
  if (sisaHari === 0) return 'Hari ini'
  if (sisaHari === 1) return 'Besok'
  return `${sisaHari} hari lagi`
}

export type SegmenTamu = {
  status: StatusRsvp
  orang: number
  // Lebar segmen terhadap total orang diundang, 0 sampai 100 (tidak dibulatkan)
  persen: number
}

// Urutan segmen pada bar kehadiran: yang pasti dulu, lalu yang belum pasti.
// Segmen dengan 0 orang tetap dikembalikan supaya legenda selalu lengkap.
const URUTAN_SEGMEN: StatusRsvp[] = [
  'hadir',
  'ragu',
  'belum_konfirmasi',
  'tidak_hadir',
]

export function segmenTamu(ringkasan: RingkasanTamu): SegmenTamu[] {
  const total = ringkasan.orang
  return URUTAN_SEGMEN.map((status) => {
    const orang = ringkasan.perStatus[status].orang
    return { status, orang, persen: total > 0 ? (orang / total) * 100 : 0 }
  })
}
