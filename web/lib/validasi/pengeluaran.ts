import { z } from 'zod'
import { adalahTanggalNyata } from './pernikahan'
import { skemaRupiahPositif } from './rupiah'

// Nilai khusus pada pilihan vendor yang berarti "buat vendor baru"
export const VENDOR_BARU = '__baru__'

const tanggalWajib = z
  .string()
  .trim()
  .refine(adalahTanggalNyata, 'Format tanggal tidak valid')

const tanggalOpsional = z
  .string()
  .trim()
  .refine((v) => v === '' || adalahTanggalNyata(v), 'Format tanggal tidak valid')
  .transform((v) => (v === '' ? null : v))

const deskripsi = z
  .string()
  .trim()
  .max(200, 'Deskripsi maksimal 200 karakter')
  .transform((v) => (v === '' ? null : v))

export const skemaPengeluaran = z
  .object({
    kategoriId: z.uuid('Pilih kategori'),
    vendorId: z.string(),
    vendorBaru: z.string().trim().max(120, 'Nama vendor maksimal 120 karakter'),
    deskripsi,
    nominal: skemaRupiahPositif,
    tanggal: tanggalWajib,
  })
  .superRefine((d, ctx) => {
    if (d.vendorId === VENDOR_BARU) {
      if (d.vendorBaru.length < 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['vendorBaru'],
          message: 'Nama vendor wajib diisi',
        })
      }
    } else if (!z.uuid().safeParse(d.vendorId).success) {
      ctx.addIssue({
        code: 'custom',
        path: ['vendorId'],
        message: 'Pilih vendor atau tambah vendor baru',
      })
    }
  })

export const skemaUbahPengeluaran = z.object({
  id: z.uuid('Pengeluaran tidak valid'),
  kategoriId: z.uuid('Pilih kategori'),
  deskripsi,
  nominal: skemaRupiahPositif,
  tanggal: tanggalWajib,
})

export const skemaIdPengeluaran = z.object({
  id: z.uuid('Pengeluaran tidak valid'),
})

// Nama kolom cicilan dibuat berbeda dari kolom pengeluaran karena keduanya
// tampil di halaman yang sama dan id elemen form harus unik
const dasarJadwal = {
  expenseId: z.uuid('Pengeluaran tidak valid'),
  jatuhTempo: tanggalWajib,
}

// Kolom yang dibaca tergantung jenis pembayaran yang dipilih
export const skemaJadwal = z.discriminatedUnion('jenis', [
  z.object({
    jenis: z.literal('dp'),
    ...dasarJadwal,
    nominalDp: skemaRupiahPositif,
    dibayarPada: tanggalOpsional,
  }),
  z.object({
    jenis: z.literal('cicilan'),
    ...dasarJadwal,
    jumlahCicilan: z
      .string()
      .regex(/^\d{1,2}$/, 'Pilih jumlah cicilan')
      .transform(Number)
      .pipe(
        z
          .number()
          .min(2, 'Minimal 2 kali')
          .max(12, 'Maksimal 12 kali')
      ),
  }),
  z.object({
    jenis: z.literal('pelunasan'),
    ...dasarJadwal,
    dibayarPada: tanggalOpsional,
  }),
])

export const skemaStatusCicilan = z.object({
  id: z.uuid('Cicilan tidak valid'),
  dibayar: z.enum(['1', '0']),
})

export const skemaIdCicilan = z.object({
  id: z.uuid('Cicilan tidak valid'),
})