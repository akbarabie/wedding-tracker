import { createClient } from '@/lib/supabase/server'
import { NILAI_BELUM, type FilterTamu } from '@/lib/validasi/filter-tamu'
import type { BarisRingkasanTamu, BarisRingkasanUndangan } from './hitung'
import type { JenisUndangan, KategoriTamu, Pihak, StatusRsvp } from './label'

export type Tamu = {
  id: string
  nama: string
  kategori: KategoriTamu
  // Kosong pada tamu lama yang belum dirinci
  sub_kategori: string | null
  pihak: Pihak | null
  jenis_undangan: JenisUndangan | null
  kontak: string | null
  status_rsvp: StatusRsvp
  jumlah_orang: number
}

// Daftar tamu terurut menurut nama, bisa disaring kategori, status, pihak, dan jenis undangan.
// Batas 1000 baris di database membuat satu kueri tanpa paginasi tetap ringan.
export async function ambilTamu(
  weddingId: string,
  filter: FilterTamu = {}
): Promise<Tamu[]> {
  const supabase = await createClient()
  let kueri = supabase
    .from('guests')
    .select(
      'id, nama, kategori, sub_kategori, pihak, jenis_undangan, kontak, status_rsvp, jumlah_orang'
    )
    .eq('wedding_id', weddingId)

  // Filter dipasang sebelum order karena order mengubah tipe pembangun kueri
  if (filter.kategori) kueri = kueri.eq('kategori', filter.kategori)
  if (filter.status) kueri = kueri.eq('status_rsvp', filter.status)
  if (filter.pihak) {
    kueri =
      filter.pihak === NILAI_BELUM
        ? kueri.is('pihak', null)
        : kueri.eq('pihak', filter.pihak)
  }
  if (filter.jenis) {
    kueri =
      filter.jenis === NILAI_BELUM
        ? kueri.is('jenis_undangan', null)
        : kueri.eq('jenis_undangan', filter.jenis)
  }

  const { data, error } = await kueri.order('nama', { ascending: true })

  if (error) {
    console.error('[ambilTamu] gagal, kode:', error.code)
    throw new Error('Gagal membaca daftar tamu')
  }
  return (data ?? []) as Tamu[]
}

// Ringkasan seluruh tamu (tidak terpengaruh filter) dari view ringkasan_tamu,
// paling banyak 28 baris sehingga tidak perlu menarik semua baris tamu.
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

// Ringkasan per pihak dan jenis undangan dari view ringkasan_undangan_tamu
export async function ambilRingkasanUndangan(
  weddingId: string
): Promise<BarisRingkasanUndangan[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ringkasan_undangan_tamu')
    .select('pihak, jenis_undangan, jumlah_undangan, jumlah_orang')
    .eq('wedding_id', weddingId)

  if (error) {
    console.error('[ambilRingkasanUndangan] gagal, kode:', error.code)
    throw new Error('Gagal membaca ringkasan undangan')
  }
  return (data ?? []) as BarisRingkasanUndangan[]
}
