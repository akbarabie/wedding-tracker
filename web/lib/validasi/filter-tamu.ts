import { z } from 'zod'
import {
  DAFTAR_KATEGORI_TAMU,
  DAFTAR_STATUS_RSVP,
  type KategoriTamu,
  type StatusRsvp,
} from '@/lib/tamu/label'
import { ambilNilai, susunQuery, type ParamMentah } from './param-url'

// Filter daftar tamu dari parameter URL. Nilai tidak valid diabaikan diam-diam,
// sama seperti filter pengeluaran dan vendor.
export type FilterTamu = {
  kategori?: KategoriTamu
  status?: StatusRsvp
}

const skemaKategori = z.enum(DAFTAR_KATEGORI_TAMU)
const skemaStatus = z.enum(DAFTAR_STATUS_RSVP)

function sebagai<T>(skema: z.ZodType<T>, nilai: string | undefined) {
  if (!nilai) return undefined
  const hasil = skema.safeParse(nilai)
  return hasil.success ? hasil.data : undefined
}

export function bacaFilterTamu(param: ParamMentah): FilterTamu {
  return {
    kategori: sebagai(skemaKategori, ambilNilai(param.kategori)),
    status: sebagai(skemaStatus, ambilNilai(param.status)),
  }
}

export function adaFilterTamu(filter: FilterTamu): boolean {
  return Object.values(filter).some(Boolean)
}

export { susunQuery }
