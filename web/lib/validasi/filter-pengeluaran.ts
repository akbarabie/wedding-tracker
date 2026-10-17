import { z } from 'zod'

// Filter laporan pengeluaran yang dibaca dari parameter URL.
// Nilai yang tidak valid diabaikan diam-diam, bukan dilempar sebagai galat,
// supaya tautan lama atau tautan yang diubah manual tidak merusak halaman.
export type FilterPengeluaran = {
  kategori?: string
  vendor?: string
  dari?: string
  sampai?: string
}

type ParamMentah = Record<string, string | string[] | undefined>

const skemaId = z.uuid()
const skemaTanggal = z.iso.date()

function ambilNilai(nilai: string | string[] | undefined): string | undefined {
  const satu = Array.isArray(nilai) ? nilai[0] : nilai
  const bersih = satu?.trim()
  return bersih ? bersih : undefined
}

function validasi(
  skema: z.ZodType<string>,
  nilai: string | undefined
): string | undefined {
  if (!nilai) return undefined
  const hasil = skema.safeParse(nilai)
  return hasil.success ? hasil.data : undefined
}

export function bacaFilter(param: ParamMentah): FilterPengeluaran {
  const filter: FilterPengeluaran = {
    kategori: validasi(skemaId, ambilNilai(param.kategori)),
    vendor: validasi(skemaId, ambilNilai(param.vendor)),
    dari: validasi(skemaTanggal, ambilNilai(param.dari)),
    sampai: validasi(skemaTanggal, ambilNilai(param.sampai)),
  }

  // Bila rentang terbalik, tukar saja daripada menampilkan hasil kosong.
  // Format ISO membuat perbandingan teks sama dengan perbandingan tanggal.
  if (filter.dari && filter.sampai && filter.dari > filter.sampai) {
    const sementara = filter.dari
    filter.dari = filter.sampai
    filter.sampai = sementara
  }

  return filter
}

export function adaFilter(filter: FilterPengeluaran): boolean {
  return Object.values(filter).some(Boolean)
}

// Menyusun query string dari filter yang sudah tervalidasi.
// Dipakai untuk tautan unduh CSV supaya selalu sama dengan yang tampil di layar.
export function susunQuery(filter: FilterPengeluaran): string {
  const param = new URLSearchParams()
  for (const [kunci, nilai] of Object.entries(filter)) {
    if (nilai) param.set(kunci, nilai)
  }
  return param.toString()
}
