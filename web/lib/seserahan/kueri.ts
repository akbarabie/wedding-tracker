import { createClient } from '@/lib/supabase/server'
import type { KategoriSeserahan, StatusSeserahan } from './label'

export type ItemSeserahan = {
  id: string
  kategori: KategoriSeserahan
  judul: string
  status: StatusSeserahan
  vendor: string | null
  link_toko: string | null
  estimasi_harga: number | null
}

// Semua item seserahan satu pernikahan, terurut menurut urutan template lalu waktu dibuat.
// Batas 300 item di database membuat satu kueri tanpa paginasi tetap ringan.
export async function ambilItemSeserahan(
  weddingId: string
): Promise<ItemSeserahan[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('seserahan_items')
    .select('id, kategori, judul, status, vendor, link_toko, estimasi_harga')
    .eq('wedding_id', weddingId)
    .order('urutan', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[ambilItemSeserahan] gagal, kode:', error.code)
    throw new Error('Gagal membaca daftar seserahan')
  }
  return (data ?? []) as ItemSeserahan[]
}
