const URL_VERIFIKASI =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

type ResponsCloudflare = {
  success: boolean
  'error-codes'?: string[]
}

// Memeriksa token Turnstile yang dikirim browser langsung ke Cloudflare.
// Token hanya bisa dipakai sekali dan berumur pendek, jadi setiap pengiriman
// form butuh token baru.
//
// Gagal tertutup: bila Cloudflare tidak bisa dihubungi atau token kosong,
// hasilnya false dan permintaan ditolak. Ini lebih aman daripada meloloskan
// permintaan tanpa pemeriksaan, dengan konsekuensi pengguna perlu mencoba lagi
// saat Cloudflare sedang bermasalah.
export async function verifikasiTurnstile(token: string): Promise<boolean> {
  const kunciRahasia = process.env.TURNSTILE_SECRET_KEY
  if (!kunciRahasia) {
    throw new Error('TURNSTILE_SECRET_KEY belum diatur')
  }
  if (!token) return false

  try {
    const respons = await fetch(URL_VERIFIKASI, {
      method: 'POST',
      body: new URLSearchParams({ secret: kunciRahasia, response: token }),
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    if (!respons.ok) {
      console.error('[turnstile] respons Cloudflare tidak ok, status:', respons.status)
      return false
    }

    const data = (await respons.json()) as ResponsCloudflare
    if (!data.success) {
      // Hanya kode galat yang dicatat, token tidak ikut masuk log
      console.error(
        '[turnstile] verifikasi ditolak, kode:',
        data['error-codes']?.join(',') ?? 'tidak diketahui'
      )
    }
    return data.success === true
  } catch {
    console.error('[turnstile] gagal menghubungi Cloudflare')
    return false
  }
}
