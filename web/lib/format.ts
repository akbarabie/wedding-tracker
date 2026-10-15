// Tanggal disimpan sebagai date murni (tanpa jam), jadi diformat dalam UTC
// agar tidak bergeser sehari karena zona waktu server.
export function formatTanggal(tanggal: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeZone: 'UTC',
  }).format(new Date(`${tanggal}T00:00:00Z`))
}

export function formatRupiah(nilai: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(nilai)
}

// Tanggal ringkas untuk daftar, misalnya "12 Okt 2026"
export function formatTanggalPendek(tanggal: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${tanggal}T00:00:00Z`))
}