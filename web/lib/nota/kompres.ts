import { BATAS_UKURAN_NOTA } from '@/lib/nota/gambar'

// Dipakai di browser sebelum nota diunggah. Alasannya ada tiga:
// 1. Foto kamera HP bisa 5 sampai 12 MB, sedangkan Vercel menolak body di atas 4,5 MB.
// 2. Menggambar ulang lewat canvas membuang data EXIF, termasuk lokasi GPS foto.
// 3. Orientasi foto diterapkan saat menggambar, jadi nota tidak terkirim miring.

// Galat umum untuk semua kegagalan menyiapkan berkas. Pesannya aman ditampilkan ke pengguna.
export class GalatKompres extends Error {}

// Berkas tidak bisa diuraikan oleh browser. Dibedakan dari galat ukuran supaya HEIC
// bisa mencoba decoder cadangan hanya pada kasus ini.
export class GalatDekode extends GalatKompres {}

// Urutan percobaan dari kualitas tinggi ke rendah. Berhenti di percobaan pertama
// yang hasilnya muat di bawah batas ukuran.
export const PERCOBAAN_KOMPRES = [
  { sisiMaks: 2000, mutu: 0.85 },
  { sisiMaks: 1600, mutu: 0.75 },
  { sisiMaks: 1200, mutu: 0.65 },
] as const

// Menghitung ukuran baru dengan sisi terpanjang tidak melebihi sisiMaks.
// Gambar yang sudah lebih kecil tidak diperbesar.
export function hitungUkuran(
  lebar: number,
  tinggi: number,
  sisiMaks: number
): { lebar: number; tinggi: number } {
  const terpanjang = Math.max(lebar, tinggi)
  if (terpanjang <= sisiMaks) return { lebar, tinggi }
  const skala = sisiMaks / terpanjang
  return {
    lebar: Math.max(1, Math.round(lebar * skala)),
    tinggi: Math.max(1, Math.round(tinggi * skala)),
  }
}

// Mencoba tiap pengaturan sampai ada hasil yang cukup kecil. Bagian ini dipisah dari
// canvas supaya alurnya bisa diuji tanpa browser. Dipakai oleh jalur gambar dan jalur PDF.
export async function kompresDenganPercobaan<T>(
  percobaan: readonly T[],
  buat: (pengaturan: T) => Promise<Blob>,
  batasByte: number = BATAS_UKURAN_NOTA
): Promise<Blob> {
  for (const pengaturan of percobaan) {
    const hasil = await buat(pengaturan)
    if (hasil.size > 0 && hasil.size <= batasByte) return hasil
  }
  throw new GalatKompres(
    'Berkas masih terlalu besar setelah diperkecil. Coba dengan resolusi yang lebih rendah.'
  )
}

export function kanvasKeBlob(canvas: HTMLCanvasElement, mutu: number): Promise<Blob> {
  return new Promise((selesai, gagal) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? selesai(blob)
          : gagal(new GalatKompres('Foto tidak bisa diproses di perangkat ini.')),
      'image/jpeg',
      mutu
    )
  })
}

// Mengecilkan gambar yang sudah terurai menjadi JPEG, maksimal 2000 piksel di sisi terpanjang.
// Pemanggil yang bertanggung jawab menutup bitmap.
export async function kompresBitmap(bitmap: ImageBitmap): Promise<File> {
  const blob = await kompresDenganPercobaan(PERCOBAAN_KOMPRES, async ({ sisiMaks, mutu }) => {
    const { lebar, tinggi } = hitungUkuran(bitmap.width, bitmap.height, sisiMaks)
    const canvas = document.createElement('canvas')
    canvas.width = lebar
    canvas.height = tinggi
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new GalatKompres('Foto tidak bisa diproses di perangkat ini.')
    // Latar putih untuk PNG transparan, karena JPEG tidak punya kanal transparan
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, lebar, tinggi)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, lebar, tinggi)
    return kanvasKeBlob(canvas, mutu)
  })
  return new File([blob], 'nota.jpg', { type: 'image/jpeg' })
}

// Menguraikan berkas gambar lewat browser lalu mengecilkannya menjadi JPEG.
export async function kompresFoto(berkas: Blob): Promise<File> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(berkas, { imageOrientation: 'from-image' })
  } catch {
    throw new GalatDekode('Foto tidak bisa dibaca. Gunakan format JPG, PNG, WEBP, HEIC, atau PDF.')
  }
  try {
    return await kompresBitmap(bitmap)
  } finally {
    bitmap.close()
  }
}
