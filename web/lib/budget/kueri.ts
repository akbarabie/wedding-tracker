import { createClient } from '@/lib/supabase/server'

export type RingkasanKategori = {
  category_id: string
  nama: string
  nilai_rencana: number
  di_luar_budget_resepsi: boolean
  total_komitmen: number
  total_dibayar: number
  jumlah_pengeluaran: number
}

// Satu kueri ke view ringkasan_kategori. RLS tetap berlaku lewat security_invoker,
// filter wedding_id di sini hanya untuk memanfaatkan indeks.
export async function ambilRingkasanKategori(
  weddingId: string
): Promise<RingkasanKategori[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ringkasan_kategori')
    .select(
      'category_id, nama, nilai_rencana, di_luar_budget_resepsi, total_komitmen, total_dibayar, jumlah_pengeluaran'
    )
    .eq('wedding_id', weddingId)
    .order('di_luar_budget_resepsi')
    .order('nama')

  if (error) {
    console.error('[ambilRingkasanKategori] gagal, kode:', error.code)
    throw new Error('Gagal membaca ringkasan budget')
  }

  return (data ?? []) as RingkasanKategori[]
}