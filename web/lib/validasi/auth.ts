import { z } from 'zod'

// Email dirapikan (spasi dan huruf besar) sebelum divalidasi formatnya
const emailValid = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Format email tidak valid'))

// Aturan kata sandi baru dipakai bersama oleh pendaftaran dan atur ulang sandi.
// Batas 72 karena bcrypt hanya memakai 72 byte pertama dari kata sandi.
const sandiBaru = z
  .string()
  .min(8, 'Kata sandi minimal 8 karakter')
  .max(72, 'Kata sandi maksimal 72 karakter')

export const skemaDaftar = z.object({
  nama: z
    .string()
    .trim()
    .min(2, 'Nama minimal 2 karakter')
    .max(80, 'Nama maksimal 80 karakter'),
  email: emailValid,
  sandi: sandiBaru,
})

export const skemaMasuk = z.object({
  email: emailValid,
  sandi: z.string().min(1, 'Kata sandi wajib diisi'),
})

export const skemaLupaSandi = z.object({
  email: emailValid,
})

export const skemaAturUlangSandi = z
  .object({
    sandi: sandiBaru,
    konfirmasi: z.string().min(1, 'Konfirmasi kata sandi wajib diisi'),
  })
  .refine((data) => data.sandi === data.konfirmasi, {
    path: ['konfirmasi'],
    message: 'Konfirmasi kata sandi tidak sama',
  })

// Mengubah daftar issue Zod menjadi peta nama kolom ke pesan galat pertama
export function petakanGalat(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
): Record<string, string> {
  const peta: Record<string, string> = {}
  for (const issue of issues) {
    const kolom = String(issue.path[0] ?? '')
    if (kolom && !peta[kolom]) peta[kolom] = issue.message
  }
  return peta
}
