import { z } from 'zod'
import { DAFTAR_BERLAKU, DAFTAR_PIHAK_DOKUMEN } from '@/lib/administrasi/label'

const catatan = z
  .string()
  .trim()
  .max(500, 'Catatan maksimal 500 karakter')
  .transform((v) => (v === '' ? null : v))

export const skemaDokumen = z.object({
  judul: z
    .string()
    .trim()
    .min(1, 'Nama dokumen wajib diisi')
    .max(200, 'Nama dokumen maksimal 200 karakter'),
  berlakuUntuk: z.enum(DAFTAR_BERLAKU, { error: 'Pilih untuk siapa dokumen ini berlaku' }),
  catatan,
})

export const skemaUbahDokumen = skemaDokumen.extend({
  id: z.uuid('Dokumen tidak valid'),
})

export const skemaIdDokumen = z.object({
  id: z.uuid('Dokumen tidak valid'),
})

// Mencentang atau membatalkan satu sel (CPP atau CPW) pada satu dokumen
export const skemaTandaiDokumen = z.object({
  id: z.uuid('Dokumen tidak valid'),
  pihak: z.enum(DAFTAR_PIHAK_DOKUMEN, { error: 'Pihak tidak valid' }),
  // Nilai tujuan: "true" untuk menandai selesai, "false" untuk membatalkan
  selesai: z.enum(['true', 'false']).transform((v) => v === 'true'),
})

export const KUNCI_FORM_DOKUMEN = ['judul', 'berlakuUntuk', 'catatan'] as const

export function bacaFormDokumen(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    KUNCI_FORM_DOKUMEN.map((k) => [k, String(formData.get(k) ?? '')])
  )
}
