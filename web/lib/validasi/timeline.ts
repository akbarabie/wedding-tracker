import { z } from 'zod'
import { DAFTAR_FASE } from '@/lib/timeline/label'
import { adalahTanggalNyata } from './pernikahan'

// Rentang deadline yang diterima, sama dengan penjaga di database (migrasi 14)
const TANGGAL_PALING_AWAL = '2020-01-01'
const TANGGAL_PALING_AKHIR = '2100-12-31'

const deadline = z
  .string()
  .trim()
  .refine((v) => v === '' || adalahTanggalNyata(v), 'Format tanggal tidak valid')
  .refine(
    (v) => !adalahTanggalNyata(v) || (v >= TANGGAL_PALING_AWAL && v <= TANGGAL_PALING_AKHIR),
    'Deadline harus antara tahun 2020 dan 2100'
  )
  .transform((v) => (v === '' ? null : v))

// Kosong berarti tugas belum punya penanggung jawab
const penanggungJawab = z
  .string()
  .trim()
  .refine((v) => v === '' || z.uuid().safeParse(v).success, 'Penanggung jawab tidak valid')
  .transform((v) => (v === '' ? null : v))

export const skemaTugas = z.object({
  judul: z
    .string()
    .trim()
    .min(1, 'Judul tugas wajib diisi')
    .max(160, 'Judul tugas maksimal 160 karakter'),
  // Form mengirim fase sebagai teks, database menyimpannya sebagai angka 1 sampai 5
  fase: z
    .string()
    .pipe(z.enum(DAFTAR_FASE.map(String) as [string, ...string[]], { error: 'Pilih fase' }))
    .transform(Number),
  deadline,
  penanggungJawab,
})

export const skemaUbahTugas = skemaTugas.extend({
  id: z.uuid('Tugas tidak valid'),
})

export const skemaIdTugas = z.object({
  id: z.uuid('Tugas tidak valid'),
})

export const skemaTandaiTugas = z.object({
  id: z.uuid('Tugas tidak valid'),
  // Nilai tujuan: "true" untuk menandai selesai, "false" untuk membuka lagi
  selesai: z.enum(['true', 'false']).transform((v) => v === 'true'),
})

// Daftar kolom form tugas, satu-satunya sumber untuk Server Action dan komponen form
export const KUNCI_FORM_TUGAS = ['judul', 'fase', 'deadline', 'penanggungJawab'] as const

export function bacaFormTugas(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    KUNCI_FORM_TUGAS.map((k) => [k, String(formData.get(k) ?? '')])
  )
}
