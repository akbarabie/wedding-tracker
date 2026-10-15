import { z } from 'zod'
import { skemaRupiah } from './rupiah'

// Tanggal hari ini menurut WIB dalam format YYYY-MM-DD.
// Server Vercel berjalan di UTC, jadi zona waktu harus disebut eksplisit
// supaya tanggal tidak bergeser pada dini hari WIB.
export function hariIniWib(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

// Memastikan teks benar-benar tanggal kalender. Pengecekan bolak-balik
// dipakai agar tanggal seperti 2026-02-31 ditolak, bukan digeser ke Maret.
export function adalahTanggalNyata(nilai: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nilai)) return false
  const tanggal = new Date(`${nilai}T00:00:00Z`)
  return (
    !Number.isNaN(tanggal.getTime()) &&
    tanggal.toISOString().slice(0, 10) === nilai
  )
}

const namaPasangan = z
  .string()
  .trim()
  .min(1, 'Nama pasangan wajib diisi')
  .max(120, 'Nama pasangan maksimal 120 karakter')

// Tanggal hari H boleh dikosongkan. Bila diisi, tidak boleh sudah lewat.
// Refine kedua sengaja lolos bila format salah, supaya hanya satu pesan yang tampil.
const tanggalHariH = z
  .string()
  .trim()
  .refine((v) => v === '' || adalahTanggalNyata(v), 'Format tanggal tidak valid')
  .refine(
    (v) => v === '' || !adalahTanggalNyata(v) || v >= hariIniWib(),
    'Tanggal hari H tidak boleh sebelum hari ini'
  )
  .transform((v) => (v === '' ? null : v))

 // Budget total memakai aturan nominal yang sama dengan modul budgeting
const budgetTotal = skemaRupiah

// Nama kunci sama dengan atribut name pada form agar petakanGalat langsung cocok
export const skemaBuatPernikahan = z.object({
  namaPasangan,
  tanggalHariH,
  budgetTotal,
})

export const skemaUndangan = z.object({
  undanganId: z.uuid('Undangan tidak valid'),
})
