// Pembantu kecil untuk membaca dan menyusun parameter URL (searchParams).
// Dipakai bersama oleh filter pengeluaran dan filter vendor.

export type ParamMentah = Record<string, string | string[] | undefined>

// Mengambil nilai pertama, merapikan spasi, dan menganggap string kosong sebagai tidak ada
export function ambilNilai(
  nilai: string | string[] | undefined
): string | undefined {
  const satu = Array.isArray(nilai) ? nilai[0] : nilai
  const bersih = satu?.trim()
  return bersih ? bersih : undefined
}

// Menyusun query string, hanya memuat kunci yang punya nilai
export function susunQuery(param: Record<string, string | undefined>): string {
  const hasil = new URLSearchParams()
  for (const [kunci, nilai] of Object.entries(param)) {
    if (nilai) hasil.set(kunci, nilai)
  }
  return hasil.toString()
}
