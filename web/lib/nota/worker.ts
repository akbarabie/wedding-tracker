// Hasil upaya memicu worker Go setelah nota tersimpan.
// - dipicu: worker menerima permintaan
// - tidak_dipasang: WORKER_URL atau WORKER_TOKEN belum diatur (misalnya saat pengembangan lokal)
// - gagal: worker tidak terjangkau, menolak, atau terlalu lama menjawab
export type HasilPicu = 'dipicu' | 'tidak_dipasang' | 'gagal'

// Render tingkat gratis bisa butuh sekitar satu menit untuk bangun dari idle
const BATAS_WAKTU_MS = 50_000

type Opsi = {
  // Dipakai uji untuk mengganti fetch asli
  fetchFn?: typeof fetch
  batasWaktuMs?: number
}

// Token hanya boleh dikirim lewat HTTPS. HTTP hanya diizinkan untuk worker di mesin lokal.
function alamatAman(url: URL): boolean {
  if (url.protocol === 'https:') return true
  return (
    url.protocol === 'http:' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  )
}

// Memicu pemrosesan satu nota di worker Go. Fungsi ini tidak pernah melempar galat,
// karena nota sudah tersimpan dengan status 'menunggu' dan bisa diproses ulang nanti.
// Hanya id nota yang dikirim. Worker membaca sendiri baris nota dari database,
// jadi isi permintaan tidak dipercaya untuk menentukan pernikahan atau path gambar.
export async function picuWorkerNota(
  idNota: string,
  opsi: Opsi = {}
): Promise<HasilPicu> {
  const alamat = process.env.WORKER_URL
  const token = process.env.WORKER_TOKEN
  if (!alamat || !token) {
    console.warn('[picuWorkerNota] WORKER_URL atau WORKER_TOKEN belum diatur, pemicu dilewati')
    return 'tidak_dipasang'
  }

  let tujuan: URL
  try {
    tujuan = new URL('/worker/process-receipt', alamat)
  } catch {
    console.error('[picuWorkerNota] WORKER_URL bukan alamat yang valid')
    return 'gagal'
  }
  if (!alamatAman(tujuan)) {
    console.error('[picuWorkerNota] WORKER_URL harus memakai HTTPS, token tidak dikirim')
    return 'gagal'
  }

  const kirim = opsi.fetchFn ?? fetch
  try {
    const respons = await kirim(tujuan, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ receipt_id: idNota }),
      signal: AbortSignal.timeout(opsi.batasWaktuMs ?? BATAS_WAKTU_MS),
      // Jangan ikuti pengalihan, supaya token tidak terkirim ke alamat lain
      redirect: 'error',
    })
    if (!respons.ok) {
      console.error('[picuWorkerNota] worker menolak, status:', respons.status)
      return 'gagal'
    }
    return 'dipicu'
  } catch (e) {
    // Hanya jenis galat yang dicatat, bukan pesan lengkap yang bisa memuat alamat
    console.error('[picuWorkerNota] worker tidak terjangkau:', e instanceof Error ? e.name : 'galat')
    return 'gagal'
  }
}
