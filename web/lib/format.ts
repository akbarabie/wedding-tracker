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

// Waktu lengkap untuk daftar unggahan, selalu menurut zona Jakarta
// karena server Vercel berjalan di UTC. Contoh keluaran: "14 Nov 2026, 10.30".
export function formatWaktuWib(isoWaktu: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(isoWaktu))
}


// Ukuran berkas yang mudah dibaca, contoh: "9,4 MB" atau "620 KB"
export function formatUkuran(byte: number): string {
  if (byte >= 1024 * 1024) {
    return `${(byte / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
  }
  return `${Math.max(1, Math.round(byte / 1024))} KB`
}
