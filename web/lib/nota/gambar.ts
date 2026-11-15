// Batas ukuran berkas nota yang diterima server, 4 MB. Angka ini sengaja di bawah
// batas body request Vercel (4,5 MB) dan sama dengan batas bucket 'nota' di database.
export const BATAS_UKURAN_NOTA = 4 * 1024 * 1024

// Ruang untuk pembatas dan nama field pada body multipart, di luar isi berkasnya
export const RUANG_MULTIPART = 64 * 1024

// Batas berkas yang masih mau diproses di browser sebelum dikecilkan. Di atas ini
// memori browser (terutama HP) berisiko habis saat menguraikan gambar atau PDF.
export const BATAS_MASUKAN_BROWSER = 50 * 1024 * 1024

// Format yang diterima sistem. Kata "jpeg" dan "jpg" sama, disimpan sebagai .jpg.
export const DAFTAR_FORMAT_NOTA = ['JPG', 'JPEG', 'PNG', 'WEBP', 'HEIC', 'PDF'] as const
export const PESAN_FORMAT_NOTA =
  'Format tidak didukung. Gunakan JPG, JPEG, PNG, WEBP, HEIC, atau PDF.'

export type TipeBerkas = {
  mime: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' | 'application/pdf'
  ekstensi: 'jpg' | 'png' | 'webp' | 'heic' | 'pdf'
}

// Ekstensi yang bisa ditampilkan langsung di tag img oleh semua browser.
// HEIC dan PDF tidak termasuk, jadi daftarnya memakai kotak keterangan.
export const EKSTENSI_BISA_DITAMPILKAN: ReadonlyArray<TipeBerkas['ekstensi']> = [
  'jpg',
  'png',
  'webp',
]

function dimulaiDengan(bytes: Uint8Array, awal: number[], geser = 0): boolean {
  if (bytes.length < geser + awal.length) return false
  return awal.every((nilai, i) => bytes[geser + i] === nilai)
}

function empatHuruf(bytes: Uint8Array, geser: number): string {
  if (bytes.length < geser + 4) return ''
  return String.fromCharCode(...bytes.slice(geser, geser + 4))
}

// Merek ftyp keluarga HEIC (gambar HEVC). Merek AVIF ('avif', 'avis') sengaja tidak ada.
const MEREK_HEIC = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs'])
// Merek HEIF generik. Dipakai HEIC maupun AVIF, jadi harus dicek merek kompatibelnya.
const MEREK_HEIF_UMUM = new Set(['mif1', 'msf1'])

// HEIC: kotak ftyp di awal berkas. Ukuran kotak (4 byte), "ftyp", merek utama,
// versi, lalu daftar merek kompatibel (masing-masing 4 byte).
function adalahHeic(bytes: Uint8Array): boolean {
  if (empatHuruf(bytes, 4) !== 'ftyp') return false
  const merekUtama = empatHuruf(bytes, 8)
  if (MEREK_HEIC.has(merekUtama)) return true
  if (!MEREK_HEIF_UMUM.has(merekUtama)) return false

  const ukuranKotak = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]
  const akhir = Math.min(ukuranKotak > 0 ? ukuranKotak : 0, bytes.length, 128)
  for (let i = 16; i + 4 <= akhir; i += 4) {
    if (MEREK_HEIC.has(empatHuruf(bytes, i))) return true
  }
  return false
}

// Mengenali jenis berkas dari byte pertamanya (magic bytes), bukan dari nama berkas
// atau Content-Type kiriman klien, karena keduanya bisa dipalsukan.
// Hanya JPEG, PNG, WebP, HEIC, dan PDF yang diterima. Selain itu dikembalikan null.
export function deteksiTipeBerkas(bytes: Uint8Array): TipeBerkas | null {
  if (dimulaiDengan(bytes, [0xff, 0xd8, 0xff])) {
    return { mime: 'image/jpeg', ekstensi: 'jpg' }
  }
  if (dimulaiDengan(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: 'image/png', ekstensi: 'png' }
  }
  // WebP: "RIFF" (4 byte), ukuran (4 byte), lalu "WEBP"
  if (
    dimulaiDengan(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    dimulaiDengan(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { mime: 'image/webp', ekstensi: 'webp' }
  }
  // PDF: "%PDF-" di awal berkas
  if (dimulaiDengan(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { mime: 'application/pdf', ekstensi: 'pdf' }
  }
  if (adalahHeic(bytes)) {
    return { mime: 'image/heic', ekstensi: 'heic' }
  }
  return null
}

// Path berkas di Storage: <id_pernikahan>/<uuid_acak>.<ekstensi>
// Formatnya harus sama dengan fungsi id_pernikahan_dari_path di migrasi 19,
// karena kebijakan akses Storage dan trigger receipts membacanya dari path ini.
export function susunPathNota(
  idPernikahan: string,
  idBerkas: string,
  ekstensi: TipeBerkas['ekstensi']
): string {
  return `${idPernikahan}/${idBerkas}.${ekstensi}`
}

// Ekstensi dari path Storage, dipakai halaman untuk memilih tampilan gambar kecil
export function ekstensiDariPath(path: string): string {
  const titik = path.lastIndexOf('.')
  return titik === -1 ? '' : path.slice(titik + 1).toLowerCase()
}
