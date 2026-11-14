import { z } from 'zod'
import {
  DAFTAR_JENIS_UNDANGAN,
  DAFTAR_KATEGORI_TAMU,
  DAFTAR_PIHAK,
  DAFTAR_STATUS_RSVP,
  cariSubKategori,
} from '@/lib/tamu/label'

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

// Basis tanpa pemeriksaan silang. Dipisah karena Zod 4 tidak mengizinkan extend()
// pada skema yang sudah memiliki refinement.
const basisTamu = z.object({
  nama: z
    .string()
    .trim()
    .min(1, 'Nama tamu wajib diisi')
    .max(120, 'Nama tamu maksimal 120 karakter'),
  kategori: z.enum(DAFTAR_KATEGORI_TAMU, { error: 'Pilih kategori' }),
  subKategori: z.string().trim().min(1, 'Pilih sub-kategori'),
  pihak: z.enum(DAFTAR_PIHAK, { error: 'Pilih pihak' }),
  jenisUndangan: z.enum(DAFTAR_JENIS_UNDANGAN, { error: 'Pilih jenis undangan' }),
  kontak,
  jumlahOrang,
  statusRsvp: z.enum(DAFTAR_STATUS_RSVP, { error: 'Pilih status kehadiran' }),
})

// Sub-kategori harus milik kategorinya, dan pihak harus termasuk yang diizinkan.
// Aturan yang sama dijaga ulang oleh database (migrasi 16).
function periksaKategori(
  d: { kategori: string; subKategori: string; pihak: string },
  ctx: z.RefinementCtx
) {
  // Sub-kategori kosong sudah dilaporkan oleh pemeriksaan kolomnya sendiri
  if (d.subKategori === '') return
  const sub = cariSubKategori(d.kategori, d.subKategori)
  if (!sub) {
    ctx.addIssue({
      code: 'custom',
      path: ['subKategori'],
      message: 'Sub-kategori tidak sesuai dengan kategori',
    })
    return
  }
  if (!(sub.pihak as readonly string[]).includes(d.pihak)) {
    ctx.addIssue({
      code: 'custom',
      path: ['pihak'],
      message: 'Pihak ini tidak tersedia untuk sub-kategori tersebut',
    })
  }
}

export const skemaTamu = basisTamu.superRefine(periksaKategori)

export const skemaUbahTamu = basisTamu
  .extend({ id: z.uuid('Tamu tidak valid') })
  .superRefine(periksaKategori)

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
  'subKategori',
  'pihak',
  'jenisUndangan',
  'kontak',
  'jumlahOrang',
  'statusRsvp',
] as const

export function bacaFormTamu(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    KUNCI_FORM_TAMU.map((k) => [k, String(formData.get(k) ?? '')])
  )
}
