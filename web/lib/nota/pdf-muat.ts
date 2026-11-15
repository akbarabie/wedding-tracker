import type { PdfjsModul } from '@/lib/nota/pdf'

// Memuat pdf.js hanya saat ada PDF yang terlalu besar. Berkasnya besar, jadi tidak
// boleh ikut dimuat di halaman biasa. Pemuatan dipisah dari pdf.ts karena baris
// alamat worker memakai import.meta yang hanya dikenali bundler.
//
// Build "legacy" dipakai dengan sengaja. Build biasa pdf.js 6.x memanggil Promise.try
// yang baru ada di Chrome 128, Firefox 134, dan Safari 18.2, sehingga gagal total di
// HP yang lebih lama. Build legacy membawa tambalannya sendiri, ukurannya hampir sama.
export async function muatPdfjs(): Promise<PdfjsModul> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()
  return pdfjs as unknown as PdfjsModul
}
