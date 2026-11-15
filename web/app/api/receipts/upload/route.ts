import { after, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ambilPernikahanAktif } from '@/lib/pernikahan/kueri'
import {
  BATAS_UKURAN_NOTA,
  RUANG_MULTIPART,
  PESAN_FORMAT_NOTA,
  deteksiTipeBerkas,
  susunPathNota,
} from '@/lib/nota/gambar'
import { picuWorkerNota } from '@/lib/nota/worker'

// Menunggu worker bangun dari idle butuh waktu, jadi fungsi diberi batas yang cukup
// untuk panggilan di after() di bawah.
export const maxDuration = 60

function balas(isi: Record<string, unknown>, status: number) {
  return Response.json(isi, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

function galat(pesan: string, status: number) {
  return balas({ galat: pesan }, status)
}

// Menerima foto nota, menyimpannya ke Storage privat, mencatat baris receipts berstatus
// 'menunggu', lalu memicu worker tanpa menunggu hasilnya.
// Berlapis: proxy menolak yang belum login dengan 401, pengecekan di sini adalah lapisan
// kedua, dan RLS di database serta kebijakan Storage menjadi lapisan ketiga.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) return galat('Belum masuk', 401)

    const pernikahan = await ambilPernikahanAktif()
    if (!pernikahan) return galat('Pernikahan belum dibuat', 404)

    const jenisIsi = request.headers.get('content-type') ?? ''
    if (!jenisIsi.toLowerCase().startsWith('multipart/form-data')) {
      return galat('Permintaan harus berupa unggahan berkas', 415)
    }

    // Tolak lebih awal bila ukuran yang diumumkan sudah melebihi batas, sebelum
    // body dibaca ke memori.
    const panjang = Number(request.headers.get('content-length'))
    if (Number.isFinite(panjang) && panjang > BATAS_UKURAN_NOTA + RUANG_MULTIPART) {
      return galat('Ukuran foto terlalu besar. Maksimal 4 MB', 413)
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return galat('Isi unggahan tidak bisa dibaca', 400)
    }

    const berkas = formData.get('berkas')
    if (!(berkas instanceof File)) return galat('Foto nota belum dipilih', 400)
    if (berkas.size === 0) return galat('Berkas kosong', 400)
    if (berkas.size > BATAS_UKURAN_NOTA) {
      return galat('Ukuran foto terlalu besar. Maksimal 4 MB', 413)
    }

    // Jenis berkas ditentukan dari isi, bukan dari nama atau Content-Type kiriman. Format selain
    // JPG, PNG, WEBP, HEIC, dan PDF ditolak di sini, sebelum menyentuh database atau Storage.
    const bytes = new Uint8Array(await berkas.arrayBuffer())
    const tipe = deteksiTipeBerkas(bytes)
    if (!tipe) return galat(PESAN_FORMAT_NOTA, 415)

    // id pernikahan selalu dari server, tidak pernah dari form
    const path = susunPathNota(pernikahan.id, crypto.randomUUID(), tipe.ekstensi)

    // Baris dicatat lebih dulu supaya batas unggahan (trigger database) menolak sebelum
    // ada berkas yang memakan kuota Storage. Bila penyimpanan berkas gagal, baris dihapus.
    const { data: baris, error: galatCatat } = await supabase
      .from('receipts')
      .insert({ wedding_id: pernikahan.id, path_gambar: path })
      .select('id')
      .single()

    if (galatCatat || !baris) {
      console.error('[POST /api/receipts/upload] gagal mencatat nota, kode:', galatCatat?.code)
      // Kode P0001 berasal dari trigger kita sendiri, pesannya aman dan sudah berbahasa Indonesia
      if (galatCatat?.code === 'P0001') return galat(galatCatat.message, 429)
      return galat('Gagal mencatat nota', 500)
    }

    const { error: galatSimpan } = await supabase.storage
      .from('nota')
      .upload(path, bytes, { contentType: tipe.mime, upsert: false })

    if (galatSimpan) {
      console.error('[POST /api/receipts/upload] gagal menyimpan berkas')
      const { error: galatHapus } = await supabase
        .from('receipts')
        .delete()
        .eq('id', baris.id)
      if (galatHapus) {
        console.error('[POST /api/receipts/upload] baris yatim tidak terhapus, kode:', galatHapus.code)
      }
      return galat('Gagal menyimpan foto nota', 500)
    }

    // Worker dipicu setelah respons terkirim, jadi pengguna tidak menunggu Render bangun.
    // Bila pemicu gagal, nota tetap 'menunggu' dan bisa diproses ulang.
    after(async () => {
      await picuWorkerNota(baris.id)
    })

    return balas({ id: baris.id, status: 'menunggu' }, 201)
  } catch (e) {
    console.error('[POST /api/receipts/upload] gagal:', e instanceof Error ? e.name : 'galat')
    return galat('Gagal mengunggah nota', 500)
  }
}
