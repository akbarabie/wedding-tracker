import { z } from 'zod'
import { skemaRupiah } from './rupiah'

export const skemaKategori = z.object({
  nama: z
    .string()
    .trim()
    .min(1, 'Nama kategori wajib diisi')
    .max(80, 'Nama kategori maksimal 80 karakter'),
  nilaiRencana: skemaRupiah,
  // Checkbox HTML mengirim "on" bila dicentang dan tidak mengirim apa pun bila tidak
  diLuarResepsi: z.string().transform((v) => v === 'on'),
})

export const skemaUbahKategori = skemaKategori
  .pick({ nama: true, nilaiRencana: true })
  .extend({ id: z.uuid('Kategori tidak valid') })

export const skemaIdKategori = z.object({
  id: z.uuid('Kategori tidak valid'),
})