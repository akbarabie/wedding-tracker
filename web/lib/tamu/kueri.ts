import { createClient } from '@/lib/supabase/server'
import type { FilterTamu } from '@/lib/validasi/filter-tamu'
import type { BarisRingkasanTamu } from './hitung'
import type { KategoriTamu, StatusRsvp } from './label'

export type Tamu = {
  id: string
  nama: string
  kategori: KategoriTamu
  kontak: string | null
  status_rsvp: StatusRsvp
  jumlah_orang: number
}

// Daftar tamu terurut menurut nama, bisa disaring kategori dan status.
// Batas 1000 baris di database membuat satu kueri tanpa paginasi tetap ringan.
export async function ambilTamu(
  weddingId: string,
  filter: FilterTamu = {}
): Promise<Tamu[]> {
  const supabase = await createClient()
  let kueri = supabase
    .from('guests')
    .select('id, nama, kategori, kontak, status_rsvp, jumlah_orang')
    .eq('wedding_id', weddingId)

  // Filter dipasang sebelum order karena order mengubah tipe pembangun kueri
  if (filter.kategori) kueri = kueri.eq('kategori', filter.kategori)
  if (filter.status) kueri = kueri.eq('status_rsvp', filter.status)

  const { data, error } = await kueri.order('nama', { ascending: true })

  if (error) {
    console.error('[ambilTamu] gagal, kode:', error.code)
    throw new Error('Gagal membaca daftar tamu')
  }
  return (data ?? []) as Tamu[]
}

// Ringkasan seluruh tamu (tidak terpengaruh filter) dari view ringkasan_tamu,
// paling banyak 12 baris sehingga tidak perlu menarik semua baris tamu.
export async function ambilRingkasanTamu(
  weddingId: string
): Promise<BarisRingkasanTamu[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ringkasan_tamu')
    .select('kategori, status_rsvp, jumlah_undangan, jumlah_orang')
    .eq('wedding_id', weddingId)

  if (error) {
    console.error('[ambilRingkasanTamu] gagal, kode:', error.code)
    throw new Error('Gagal membaca ringkasan tamu')
  }
  return (data ?? []) as BarisRingkasanTamu[]
}
