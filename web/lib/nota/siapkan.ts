import { BATAS_MASUKAN_BROWSER, BATAS_UKURAN_NOTA, PESAN_FORMAT_NOTA, deteksiTipeBerkas } from '@/lib/nota/gambar'
import { GalatDekode, GalatKompres, kompresBitmap, kompresFoto } from '@/lib/nota/kompres'
import { ubahHeicKeBitmap } from '@/lib/nota/heic'
import { pdfKeJpeg } from '@/lib/nota/pdf'

// Langkah yang bisa diganti saat uji
export type DepsSiapkan = {
  kompresFoto: (berkas: Blob) => Promise<File>
  kompresBitmap: (bitmap: ImageBitmap) => Promise<File>
  ubahHeic: (berkas: Blob) => Promise<ImageBitmap>
  pdfKeJpeg: (berkas: Blob) => Promise<File>
}

const DEPS_ASLI: DepsSiapkan = {
  kompresFoto,
  kompresBitmap,
  ubahHeic: ubahHeicKeBitmap,
  pdfKeJpeg,
}

// Mengenali jenis berkas dari isinya. Dipakai form saat berkas dipilih, supaya format
// yang tidak didukung langsung ditolak sebelum ada yang dikirim ke server.
export async function kenaliBerkas(berkas: Blob) {
  const awal = new Uint8Array(await berkas.slice(0, 128).arrayBuffer())
  return deteksiTipeBerkas(awal)
}

// Menyiapkan berkas apa pun yang didukung menjadi berkas yang muat di batas ukuran server.
// - JPG, PNG, WEBP: digambar ulang menjadi JPEG kecil (lokasi GPS ikut terbuang).
// - HEIC: diuraikan browser, atau decoder cadangan, lalu menjadi JPEG kecil.
// - PDF: diunggah apa adanya bila muat, bila tidak diubah menjadi gambar JPEG.
// Ukuran berkas asal tidak menjadi alasan penolakan, selama masih di bawah batas browser.
export async function siapkanBerkasNota(
  berkas: File,
  deps: DepsSiapkan = DEPS_ASLI
): Promise<File> {
  if (berkas.size > BATAS_MASUKAN_BROWSER) {
    throw new GalatKompres('Berkas lebih dari 50 MB, terlalu besar untuk diproses di browser.')
  }

  const tipe = await kenaliBerkas(berkas)
  if (!tipe) throw new GalatKompres(PESAN_FORMAT_NOTA)

  switch (tipe.ekstensi) {
    case 'pdf':
      if (berkas.size <= BATAS_UKURAN_NOTA) {
        return new File([berkas], 'nota.pdf', { type: 'application/pdf' })
      }
      return deps.pdfKeJpeg(berkas)

    case 'heic': {
      try {
        return await deps.kompresFoto(berkas)
      } catch (e) {
        // Hanya kegagalan menguraikan yang memicu decoder cadangan
        if (!(e instanceof GalatDekode)) throw e
      }
      let bitmap: ImageBitmap
      try {
        bitmap = await deps.ubahHeic(berkas)
      } catch {
        // Decoder cadangan juga gagal. HEIC kecil tetap diterima server apa adanya.
        if (berkas.size <= BATAS_UKURAN_NOTA) {
          return new File([berkas], 'nota.heic', { type: 'image/heic' })
        }
        throw new GalatKompres(
          'Foto HEIC ini tidak bisa diproses di perangkat ini. Ubah ke JPG lalu coba lagi.'
        )
      }
      try {
        return await deps.kompresBitmap(bitmap)
      } finally {
        bitmap.close()
      }
    }

    default:
      return deps.kompresFoto(berkas)
  }
}
