import { z } from 'zod'
import {
  DAFTAR_SATUAN,
  DAFTAR_STATUS_VENDOR,
  type Satuan,
  type StatusVendor,
} from '@/lib/vendor/label'
import { ambilNilai, susunQuery, type ParamMentah } from './param-url'

// Filter daftar vendor dari parameter URL. Nilai tidak valid diabaikan diam-diam,
// sama seperti filter pengeluaran.
export type FilterVendor = {
  kategori?: string
  status?: StatusVendor
}

const skemaId = z.uuid()
const skemaStatus = z.enum(DAFTAR_STATUS_VENDOR)

function sebagai<T>(skema: z.ZodType<T>, nilai: string | undefined) {
  if (!nilai) return undefined
  const hasil = skema.safeParse(nilai)
  return hasil.success ? hasil.data : undefined
}

export function bacaFilterVendor(param: ParamMentah): FilterVendor {
  return {
    kategori: sebagai(skemaId, ambilNilai(param.kategori)),
    status: sebagai(skemaStatus, ambilNilai(param.status)),
  }
}

export function adaFilterVendor(filter: FilterVendor): boolean {
  return Object.values(filter).some(Boolean)
}

// Skenario perbandingan: nilai untuk tiap satuan (tamu, jam, orang, buah) dari parameter URL.
// Hanya bilangan bulat positif yang diterima. Isian lain dicatat sebagai tidak valid
// supaya halaman bisa menampilkan pesan, bukan diam saja.
export type SkenarioBaca = {
  nilai: Partial<Record<Satuan, number>>
  tidakValid: Partial<Record<Satuan, true>>
}

export function bacaSkenario(param: ParamMentah): SkenarioBaca {
  const nilai: SkenarioBaca['nilai'] = {}
  const tidakValid: SkenarioBaca['tidakValid'] = {}

  for (const satuan of DAFTAR_SATUAN) {
    const mentah = ambilNilai(param[satuan])
    if (mentah === undefined) continue
    if (!/^\d{1,6}$/.test(mentah) || Number(mentah) <= 0) {
      tidakValid[satuan] = true
      continue
    }
    nilai[satuan] = Number(mentah)
  }
  return { nilai, tidakValid }
}

export { susunQuery }
