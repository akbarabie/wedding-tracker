import { createClient } from '@/lib/supabase/server'
import { EKSTENSI_BISA_DITAMPILKAN, ekstensiDariPath } from '@/lib/nota/gambar'
import type { StatusNota } from '@/lib/nota/label'

export type Nota = {
  id: string
  status_proses: StatusNota
  pesan_galat: string | null
  created_at: string
  path_gambar: string
  expense_id: string | null
}

// Umur signed URL gambar nota. Cukup untuk satu kali tampil halaman, lalu kedaluwarsa,
// jadi tautan yang bocor dari riwayat browser tidak berguna lama.
const UMUR_URL_DETIK = 300

// Mengambil nota terbaru satu pernikahan beserta signed URL gambarnya.
// RLS pada tabel receipts dan kebijakan Storage sama-sama membatasi akses ke anggota
// pernikahan, jadi signed URL dibuat atas nama pengguna yang login, bukan service_role.
export async function ambilNotaTerbaru(
  idPernikahan: string,
  batas = 20
): Promise<{ nota: Nota[]; urlGambar: Record<string, string> }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('receipts')
    .select('id, status_proses, pesan_galat, created_at, path_gambar, expense_id')
    .eq('wedding_id', idPernikahan)
    .order('created_at', { ascending: false })
    .limit(batas)

  if (error) {
    console.error('[ambilNotaTerbaru] gagal, kode:', error.code)
    throw new Error('Gagal membaca daftar nota')
  }

  const nota = (data ?? []) as Nota[]
  const urlGambar: Record<string, string> = {}

  // Hanya JPG, PNG, dan WEBP yang bisa jadi gambar kecil. PDF dan HEIC tidak bisa
  // ditampilkan di tag img oleh semua browser, jadi tidak perlu dibuatkan URL.
  const pathGambar = nota
    .map((n) => n.path_gambar)
    .filter((p) =>
      EKSTENSI_BISA_DITAMPILKAN.includes(ekstensiDariPath(p) as (typeof EKSTENSI_BISA_DITAMPILKAN)[number])
    )
  if (pathGambar.length === 0) return { nota, urlGambar }

  // Kegagalan membuat URL tidak fatal: daftar tetap tampil tanpa gambar kecil
  const { data: tertanda, error: galatUrl } = await supabase.storage
    .from('nota')
    .createSignedUrls(pathGambar, UMUR_URL_DETIK)
  if (galatUrl) {
    console.error('[ambilNotaTerbaru] gagal membuat signed URL')
    return { nota, urlGambar }
  }
  for (const item of tertanda ?? []) {
    if (item.path && item.signedUrl) urlGambar[item.path] = item.signedUrl
  }
  return { nota, urlGambar }
}
