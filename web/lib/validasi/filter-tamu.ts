import { z } from 'zod'
import {
  DAFTAR_JENIS_UNDANGAN,
  DAFTAR_KATEGORI_TAMU,
  DAFTAR_PIHAK,
  DAFTAR_STATUS_RSVP,
  type JenisUndangan,
  type KategoriTamu,
  type Pihak,
  type StatusRsvp,
} from '@/lib/tamu/label'
import { ambilNilai, susunQuery, type ParamMentah } from './param-url'

// Filter daftar tamu dari parameter URL. Nilai tidak valid diabaikan diam-diam,
// sama seperti filter pengeluaran dan vendor.
//
// Untuk pihak dan jenis undangan ada nilai khusus "belum" yang berarti kolomnya masih
// kosong, yaitu tamu lama yang belum dilengkapi.
export const NILAI_BELUM = 'belum' as const

export type FilterTamu = {
  kategori?: KategoriTamu
  status?: StatusRsvp
  pihak?: Pihak | typeof NILAI_BELUM
  jenis?: JenisUndangan | typeof NILAI_BELUM
}

const skemaKategori = z.enum(DAFTAR_KATEGORI_TAMU)
const skemaStatus = z.enum(DAFTAR_STATUS_RSVP)
const skemaPihak = z.enum([...DAFTAR_PIHAK, NILAI_BELUM])
const skemaJenis = z.enum([...DAFTAR_JENIS_UNDANGAN, NILAI_BELUM])

function sebagai<T>(skema: z.ZodType<T>, nilai: string | undefined) {
  if (!nilai) return undefined
  const hasil = skema.safeParse(nilai)
  return hasil.success ? hasil.data : undefined
}

export function bacaFilterTamu(param: ParamMentah): FilterTamu {
  return {
    kategori: sebagai(skemaKategori, ambilNilai(param.kategori)),
    status: sebagai(skemaStatus, ambilNilai(param.status)),
    pihak: sebagai(skemaPihak, ambilNilai(param.pihak)),
    jenis: sebagai(skemaJenis, ambilNilai(param.jenis)),
  }
}

export function adaFilterTamu(filter: FilterTamu): boolean {
  return Object.values(filter).some(Boolean)
}

export { susunQuery }
