import { tambahBulan } from '@/lib/pengeluaran/jadwal'
import { selisihHari } from '@/lib/waktu'
import {
  DAFTAR_FASE,
  adalahFase,
  type Fase,
  type StatusDeadline,
} from './label'

// Tugas dianggap "segera" bila deadline dalam rentang ini. Angkanya sama dengan
// ambang reminder pertama di PRD 6.6 (tujuh hari).
export const AMBANG_SEGERA_HARI = 7

// Berapa bulan sebelum hari H tiap fase berakhir. Fase 5 berakhir tepat di hari H.
const BULAN_AKHIR_FASE: Record<Fase, number> = { 1: 9, 2: 6, 3: 3, 4: 1, 5: 0 }

// Tanggal terakhir sebuah fase, dihitung mundur dari hari H (YYYY-MM-DD)
export function akhirFase(fase: Fase, hariH: string): string {
  const bulan = BULAN_AKHIR_FASE[fase]
  return bulan === 0 ? hariH : tambahBulan(hariH, -bulan)
}

// Fase yang sedang berjalan: fase pertama yang tanggal akhirnya belum lewat.
// Rentang di PRD punya jeda antar fase (misalnya antara 9 dan 8 bulan), dan pada
// masa jeda itu fase berikutnya dianggap yang akan dikerjakan. Mengembalikan null
// bila hari H belum diisi atau sudah lewat.
export function faseSaatIni(hariH: string | null, hariIni: string): Fase | null {
  if (!hariH) return null
  for (const fase of DAFTAR_FASE) {
    if (hariIni <= akhirFase(fase, hariH)) return fase
  }
  return null
}

// Sisa hari menuju hari H. Negatif bila sudah lewat, null bila hari H belum diisi.
export function sisaHariKeHariH(
  hariH: string | null,
  hariIni: string
): number | null {
  return hariH ? selisihHari(hariIni, hariH) : null
}

// Teks hitung mundur menuju hari H, dipakai di Timeline dan Ringkasan
export function teksHitungMundur(sisa: number): string {
  if (sisa > 0) return `H-${sisa}`
  if (sisa === 0) return 'Hari H adalah hari ini'
  return 'Hari H sudah lewat'
}

export type TugasDeadline = { deadline: string | null; selesai: boolean }

export function statusDeadline(
  tugas: TugasDeadline,
  hariIni: string
): StatusDeadline {
  if (tugas.selesai) return 'selesai'
  if (!tugas.deadline) return 'tanpa_deadline'
  const sisa = selisihHari(hariIni, tugas.deadline)
  if (sisa < 0) return 'terlambat'
  if (sisa <= AMBANG_SEGERA_HARI) return 'segera'
  return 'normal'
}

export type TugasUrut = {
  fase: number
  deadline: string | null
  selesai: boolean
  created_at: string
}

// Urutan dalam satu fase: yang belum selesai di atas, lalu deadline terdekat,
// tugas tanpa deadline di bawahnya, dan terakhir urutan dibuat.
export function bandingkanTugas(a: TugasUrut, b: TugasUrut): number {
  if (a.selesai !== b.selesai) return a.selesai ? 1 : -1
  if (a.deadline !== b.deadline) {
    if (a.deadline === null) return 1
    if (b.deadline === null) return -1
    return a.deadline < b.deadline ? -1 : 1
  }
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0
}

export type KemajuanFase = { total: number; selesai: number }

export type Kemajuan = {
  total: number
  selesai: number
  persen: number
  perFase: Record<Fase, KemajuanFase>
}

// Progres checklist keseluruhan dan per fase. Persen dibulatkan ke bilangan bulat,
// dan tanpa tugas sama sekali dianggap 0 persen.
export function hitungKemajuan(tugas: { fase: number; selesai: boolean }[]): Kemajuan {
  const perFase = Object.fromEntries(
    DAFTAR_FASE.map((f) => [f, { total: 0, selesai: 0 }])
  ) as Record<Fase, KemajuanFase>

  let total = 0
  let selesai = 0
  for (const t of tugas) {
    if (!adalahFase(t.fase)) continue
    total += 1
    perFase[t.fase].total += 1
    if (t.selesai) {
      selesai += 1
      perFase[t.fase].selesai += 1
    }
  }

  return {
    total,
    selesai,
    persen: total === 0 ? 0 : Math.round((selesai / total) * 100),
    perFase,
  }
}
