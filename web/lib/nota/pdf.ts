import { GalatDekode, GalatKompres, kanvasKeBlob, kompresDenganPercobaan } from '@/lib/nota/kompres'

// PDF yang masih muat di batas ukuran diunggah apa adanya, supaya teksnya tetap bisa
// dibaca AI. PDF yang lebih besar diubah menjadi satu gambar JPEG: halaman-halamannya
// digambar ke canvas, disusun ke bawah, lalu dikecilkan sampai muat.

// Jumlah halaman yang dibaca. Nota hampir selalu 1 sampai 3 halaman, dan batas ini
// menjaga memori browser HP tetap aman.
export const MAKS_HALAMAN_PDF = 3
// Lebar tiap halaman saat digambar, dalam piksel. Cukup tajam untuk teks nota kecil.
export const LEBAR_HALAMAN_PDF = 1400
// Tinggi gabungan maksimal, jauh di bawah batas canvas browser (sekitar 16 ribu piksel)
export const TINGGI_MAKS_PDF = 8000

// Skala dan mutu tiap percobaan, dari tajam ke ringan
export const PERCOBAAN_PDF = [
  { skala: 1, mutu: 0.85 },
  { skala: 0.8, mutu: 0.75 },
  { skala: 0.6, mutu: 0.65 },
] as const

// Bentuk minimal pdf.js yang dipakai di sini. Dibuat sendiri supaya modul ini bisa
// diuji dengan pdf.js versi Node dan tidak terikat pada jenis tipe bawaan pustaka.
export type PdfjsModul = {
  getDocument(sumber: { data: Uint8Array }): {
    promise: Promise<{
      numPages: number
      getPage(nomor: number): Promise<{
        getViewport(opsi: { scale: number }): { width: number; height: number }
        render(opsi: {
          canvas: unknown
          viewport: { width: number; height: number }
        }): { promise: Promise<void> }
      }>
    }>
    // Melepas dokumen dan worker dari memori. Ada di tugas pemuatan, bukan di dokumennya.
    destroy(): Promise<void>
  }
}

// Canvas minimal yang dibutuhkan. Browser memakai HTMLCanvasElement, uji Node memakai canvas tiruan.
export type Kanvas = {
  width: number
  height: number
  getContext(jenis: '2d'): KonteksKanvas | null
}
export type KonteksKanvas = {
  fillStyle: unknown
  fillRect(x: number, y: number, l: number, t: number): void
  drawImage(sumber: unknown, ...argumen: number[]): void
  getImageData(x: number, y: number, l: number, t: number): { data: ArrayLike<number> }
}

export type DepsPdf = {
  muat: () => Promise<PdfjsModul>
  buatKanvas: (lebar: number, tinggi: number) => Kanvas
  kanvasKeBlob: (kanvas: Kanvas, mutu: number) => Promise<Blob>
}

function ambilKonteks(kanvas: Kanvas): KonteksKanvas {
  const ctx = kanvas.getContext('2d')
  if (!ctx) throw new GalatKompres('Berkas tidak bisa diproses di perangkat ini.')
  return ctx
}

// Mengecek apakah hasil gambar praktis putih polos. Terjadi bila pdf.js gagal menguraikan
// isi PDF (misalnya gambar berformat yang tidak didukung). Tanpa pengecekan ini, gambar
// kosong akan terunggah dan dinilai bukan nota oleh AI.
// Gambar diperkecil dulu ke lebar 200 piksel supaya pengecekan cepat, lalu dihitung
// proporsi piksel yang cukup gelap.
export function kanvasKosong(
  kanvas: Kanvas,
  buatKanvas: DepsPdf['buatKanvas']
): boolean {
  const lebar = 200
  const tinggi = Math.max(1, Math.round((kanvas.height / kanvas.width) * lebar))
  const kecil = buatKanvas(lebar, tinggi)
  const ctx = ambilKonteks(kecil)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, lebar, tinggi)
  ctx.drawImage(kanvas, 0, 0, lebar, tinggi)
  const { data } = ctx.getImageData(0, 0, lebar, tinggi)
  let gelap = 0
  for (let i = 0; i < data.length; i += 4) {
    const terang = (data[i] + data[i + 1] + data[i + 2]) / 3
    if (terang < 235) gelap++
  }
  return gelap / (lebar * tinggi) < 0.001
}

// Menggambar halaman-halaman pertama PDF ke satu canvas yang tersusun ke bawah.
export async function renderPdfKeKanvas(
  berkas: Blob,
  deps: DepsPdf
): Promise<{ kanvas: Kanvas; halamanDibaca: number; totalHalaman: number }> {
  const data = new Uint8Array(await berkas.arrayBuffer())
  const pdfjs = await deps.muat()

  const tugas = pdfjs.getDocument({ data })
  let dokumen: Awaited<typeof tugas.promise>
  try {
    dokumen = await tugas.promise
  } catch (e) {
    await tugas.destroy().catch(() => undefined)
    const kunci = e instanceof Error && e.name === 'PasswordException'
    throw new GalatDekode(
      kunci
        ? 'PDF ini dikunci kata sandi. Buka kuncinya dulu, lalu coba lagi.'
        : 'PDF tidak bisa dibuka. Berkasnya mungkin rusak.'
    )
  }

  try {
    const jumlah = Math.min(dokumen.numPages, MAKS_HALAMAN_PDF)
    const halaman: Kanvas[] = []
    let tinggiTotal = 0

    for (let nomor = 1; nomor <= jumlah; nomor++) {
      const pg = await dokumen.getPage(nomor)
      const awal = pg.getViewport({ scale: 1 })
      const viewport = pg.getViewport({ scale: LEBAR_HALAMAN_PDF / awal.width })
      const tinggi = Math.round(viewport.height)
      if (tinggiTotal + tinggi > TINGGI_MAKS_PDF) break

      const k = deps.buatKanvas(Math.round(viewport.width), tinggi)
      const ctx = ambilKonteks(k)
      // Latar putih, karena PDF biasanya transparan di luar tulisan
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, k.width, k.height)
      await pg.render({ canvas: k, viewport }).promise
      halaman.push(k)
      tinggiTotal += tinggi
    }

    if (halaman.length === 0) {
      throw new GalatKompres('Halaman PDF terlalu besar untuk diproses.')
    }
    if (halaman.every((k) => kanvasKosong(k, deps.buatKanvas))) {
      throw new GalatKompres(
        'Isi PDF tidak bisa ditampilkan di browser ini. Coba ubah PDF menjadi foto, lalu unggah lagi.'
      )
    }

    const gabungan = deps.buatKanvas(LEBAR_HALAMAN_PDF, tinggiTotal)
    const ctxGabungan = ambilKonteks(gabungan)
    ctxGabungan.fillStyle = '#ffffff'
    ctxGabungan.fillRect(0, 0, gabungan.width, gabungan.height)
    let y = 0
    for (const k of halaman) {
      ctxGabungan.drawImage(k, 0, y)
      y += k.height
    }
    return { kanvas: gabungan, halamanDibaca: halaman.length, totalHalaman: dokumen.numPages }
  } finally {
    await tugas.destroy().catch(() => undefined)
  }
}

// Mengubah PDF besar menjadi satu JPEG yang muat di batas ukuran.
export async function pdfKeJpeg(berkas: Blob, deps: DepsPdf = depsBrowser()): Promise<File> {
  const { kanvas } = await renderPdfKeKanvas(berkas, deps)
  const blob = await kompresDenganPercobaan(PERCOBAAN_PDF, async ({ skala, mutu }) => {
    const lebar = Math.max(1, Math.round(kanvas.width * skala))
    const tinggi = Math.max(1, Math.round(kanvas.height * skala))
    const kecil = deps.buatKanvas(lebar, tinggi)
    const ctx = ambilKonteks(kecil)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, lebar, tinggi)
    ctx.drawImage(kanvas, 0, 0, lebar, tinggi)
    return deps.kanvasKeBlob(kecil, mutu)
  })
  return new File([blob], 'nota.jpg', { type: 'image/jpeg' })
}

// Pengaturan untuk browser sungguhan
export function depsBrowser(): DepsPdf {
  return {
    muat: async () => (await import('@/lib/nota/pdf-muat')).muatPdfjs(),
    buatKanvas: (lebar, tinggi) => {
      const k = document.createElement('canvas')
      k.width = lebar
      k.height = tinggi
      return k as unknown as Kanvas
    },
    kanvasKeBlob: (k, mutu) => kanvasKeBlob(k as unknown as HTMLCanvasElement, mutu),
  }
}
