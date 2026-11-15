// Decoder HEIC cadangan berbasis WebAssembly. Hanya dimuat saat dibutuhkan, yaitu bila
// browser tidak bisa menguraikan HEIC sendiri (Chrome, Brave, dan Firefox di Linux atau
// Windows tanpa codec HEIF). Safari dan iOS bisa menguraikannya tanpa pustaka ini.
// Varian "heic-to/next" dipakai karena dibuat khusus untuk bundler Next.js.
export async function ubahHeicKeBitmap(berkas: Blob): Promise<ImageBitmap> {
  const { heicTo } = await import('heic-to/next')
  return heicTo({ blob: berkas, type: 'bitmap' })
}
