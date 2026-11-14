import { z } from 'zod'
import {
  DAFTAR_KATEGORI_SESERAHAN,
  DAFTAR_STATUS_SESERAHAN,
} from '@/lib/seserahan/label'

const vendor = z
  .string()
  .trim()
  .max(120, 'Nama vendor atau brand maksimal 120 karakter')
  .transform((v) => (v === '' ? null : v))

// Tautan toko hanya boleh http atau https. Awalan scheme wajib ditulis, sama dengan CHECK
// di database, dan skema lain seperti javascript: atau data: selalu ditolak.
function tautanWebAman(nilai: string): boolean {
  if (!/^https?:\/\//i.test(nilai)) return false
  try {
    const url = new URL(nilai)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const linkToko = z
  .string()
  .trim()
  .max(2000, 'Tautan terlalu panjang')
  .refine(
    (v) => v === '' || tautanWebAman(v),
    'Tautan harus diawali http:// atau https://'
  )
  .transform((v) => (v === '' ? null : v))

// Estimasi harga yang kosong berarti belum diketahui (null), berbeda dengan 0.
// Batas 12 digit mengikuti kolom numeric(14,2).
const estimasiHarga = z
  .string()
  .transform((v) => v.replace(/rp/gi, '').replace(/[\s.]/g, ''))
  .pipe(z.string().regex(/^\d{0,12}$/, 'Harga hanya boleh berisi angka, maksimal 12 digit'))
  .transform((v) => (v === '' ? null : Number(v)))

export const skemaItemSeserahan = z.object({
  kategori: z.enum(DAFTAR_KATEGORI_SESERAHAN, { error: 'Pilih kategori' }),
  judul: z
    .string()
    .trim()
    .min(1, 'Nama item wajib diisi')
    .max(160, 'Nama item maksimal 160 karakter'),
  status: z.enum(DAFTAR_STATUS_SESERAHAN, { error: 'Pilih status' }),
  vendor,
  linkToko,
  estimasiHarga,
})

export const skemaUbahItemSeserahan = skemaItemSeserahan.extend({
  id: z.uuid('Item tidak valid'),
})

export const skemaIdItemSeserahan = z.object({
  id: z.uuid('Item tidak valid'),
})

// Ubah cepat status dari daftar tanpa membuka form
export const skemaUbahStatusSeserahan = z.object({
  id: z.uuid('Item tidak valid'),
  status: z.enum(DAFTAR_STATUS_SESERAHAN, { error: 'Status tidak valid' }),
})

export const KUNCI_FORM_SESERAHAN = [
  'kategori',
  'judul',
  'status',
  'vendor',
  'linkToko',
  'estimasiHarga',
] as const

export function bacaFormSeserahan(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    KUNCI_FORM_SESERAHAN.map((k) => [k, String(formData.get(k) ?? '')])
  )
}
