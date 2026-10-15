import { z } from 'zod'

// Mengubah isian seperti "Rp 150.000.000" menjadi "150000000".
// Kolom kosong dianggap 0.
function rapikanRupiah(nilai: string): string {
  const bersih = nilai.replace(/rp/gi, '').replace(/[\s.]/g, '')
  return bersih === '' ? '0' : bersih
}

// Batas 12 digit mengikuti kolom numeric(14,2) di database
export const skemaRupiah = z
  .string()
  .transform(rapikanRupiah)
  .pipe(
    z
      .string()
      .regex(/^\d{1,12}$/, 'Nominal hanya boleh berisi angka, maksimal 12 digit')
  )
  .transform(Number)

// Nominal transaksi harus lebih dari nol
export const skemaRupiahPositif = skemaRupiah.refine(
  (n) => n > 0,
  'Nominal harus lebih dari 0'
)