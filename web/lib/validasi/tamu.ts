import { z } from 'zod'
import { DAFTAR_KATEGORI_TAMU, DAFTAR_STATUS_RSVP } from '@/lib/tamu/label'

const kontak = z
  .string()
  .trim()
  .max(120, 'Kontak maksimal 120 karakter')
  .transform((v) => (v === '' ? null : v))

// Batas 1 sampai 20 orang per undangan sama dengan CHECK di tabel guests
const jumlahOrang = z
  .string()
  .trim()
  .transform((v) => (v === '' ? '1' : v))
  .pipe(z.string().regex(/^\d{1,2}$/, 'Isi jumlah orang dengan angka 1 sampai 20'))
  .transform(Number)
  .refine((v) => v >= 1 && v <= 20, 'Jumlah orang harus antara 1 sampai 20')

export const skemaTamu = z.object({
  nama: z
    .string()
    .trim()
    .min(1, 'Nama tamu wajib diisi')
    .max(120, 'Nama tamu maksimal 120 karakter'),
  kategori: z.enum(DAFTAR_KATEGORI_TAMU, { error: 'Pilih kategori' }),
  kontak,
  jumlahOrang,
  statusRsvp: z.enum(DAFTAR_STATUS_RSVP, { error: 'Pilih status kehadiran' }),
})

export const skemaUbahTamu = skemaTamu.extend({
  id: z.uuid('Tamu tidak valid'),
})

export const skemaIdTamu = z.object({
  id: z.uuid('Tamu tidak valid'),
})

// Ubah cepat status RSVP dari daftar tanpa membuka form
export const skemaUbahStatusRsvp = z.object({
  id: z.uuid('Tamu tidak valid'),
  statusRsvp: z.enum(DAFTAR_STATUS_RSVP, { error: 'Status tidak valid' }),
})

// Daftar kolom form tamu, satu-satunya sumber untuk Server Action dan komponen form
export const KUNCI_FORM_TAMU = [
  'nama',
  'kategori',
  'kontak',
  'jumlahOrang',
  'statusRsvp',
] as const

export function bacaFormTamu(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    KUNCI_FORM_TAMU.map((k) => [k, String(formData.get(k) ?? '')])
  )
}
