import { createClient } from '@/lib/supabase/server'
import type { StatusPembayaran } from './hitung'
import type { FilterPengeluaran } from '@/lib/validasi/filter-pengeluaran'

export type Cicilan = {
  id: string
  jenis: 'dp' | 'cicilan' | 'pelunasan'
  label: string
  nominal: number
  jatuh_tempo: string
  dibayar_pada: string | null
  catatan: string | null
}

export type PengeluaranDaftar = {
  id: string
  deskripsi: string | null
  nominal: number
  tanggal: string
  status_pembayaran: StatusPembayaran
  vendors: { nama: string } | null
  budget_categories: { nama: string } | null
  payments: Pick<Cicilan, 'nominal' | 'dibayar_pada'>[]
}

export type PengeluaranDetail = Omit<PengeluaranDaftar, 'payments'> & {
  category_id: string | null
  payments: Cicilan[]
}

export type OpsiKategori = {
  id: string
  nama: string
  di_luar_budget_resepsi: boolean
}

export type OpsiVendor = { id: string; nama: string }

// Hanya entri final yang masuk daftar. Draf hasil ekstraksi nota punya
// halaman konfirmasi sendiri di tahap berikutnya.
// Filter opsional dipakai bersama oleh halaman daftar dan ekspor CSV,
// jadi angka di layar dan di berkas unduhan selalu sama.
export async function ambilDaftarPengeluaran(
  weddingId: string,
  filter: FilterPengeluaran = {}
): Promise<PengeluaranDaftar[]> {
  const supabase = await createClient()
  let kueri = supabase
    .from('expenses')
    .select(
      'id, deskripsi, nominal, tanggal, status_pembayaran, vendors(nama), budget_categories(nama), payments(nominal, dibayar_pada)'
    )
    .eq('wedding_id', weddingId)
    .eq('status_entri', 'final')

  // Semua filter dipasang sebelum order, karena order mengubah tipe pembangun kueri
  if (filter.kategori) kueri = kueri.eq('category_id', filter.kategori)
  if (filter.vendor) kueri = kueri.eq('vendor_id', filter.vendor)
  if (filter.dari) kueri = kueri.gte('tanggal', filter.dari)
  if (filter.sampai) kueri = kueri.lte('tanggal', filter.sampai)

  const { data, error } = await kueri
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[ambilDaftarPengeluaran] gagal, kode:', error.code)
    throw new Error('Gagal membaca daftar pengeluaran')
  }
  return (data ?? []) as unknown as PengeluaranDaftar[]
}

export async function ambilDetailPengeluaran(
  weddingId: string,
  id: string
): Promise<PengeluaranDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select(
      'id, deskripsi, nominal, tanggal, status_pembayaran, category_id, vendors(nama), budget_categories(nama), payments(id, label, nominal, jatuh_tempo, dibayar_pada, catatan)'
    )
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .eq('status_entri', 'final')
    .order('jatuh_tempo', { referencedTable: 'payments', ascending: true })
    .maybeSingle()

  if (error) {
    console.error('[ambilDetailPengeluaran] gagal, kode:', error.code)
    throw new Error('Gagal membaca detail pengeluaran')
  }
  return (data as unknown as PengeluaranDetail | null) ?? null
}

export async function ambilKategoriOpsi(
  weddingId: string
): Promise<OpsiKategori[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('budget_categories')
    .select('id, nama, di_luar_budget_resepsi')
    .eq('wedding_id', weddingId)
    .order('di_luar_budget_resepsi')
    .order('nama')

  if (error) {
    console.error('[ambilKategoriOpsi] gagal, kode:', error.code)
    throw new Error('Gagal membaca kategori')
  }
  return (data ?? []) as OpsiKategori[]
}

async function ambilVendorOpsi(weddingId: string): Promise<OpsiVendor[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vendors')
    .select('id, nama')
    .eq('wedding_id', weddingId)
    .neq('status', 'ditolak')
    .order('nama')

  if (error) {
    console.error('[ambilVendorOpsi] gagal, kode:', error.code)
    throw new Error('Gagal membaca vendor')
  }
  return (data ?? []) as OpsiVendor[]
}

// Dua kueri dijalankan paralel, jadi waktunya sama dengan yang paling lambat
export async function ambilOpsiForm(weddingId: string) {
  const [kategori, vendor] = await Promise.all([
    ambilKategoriOpsi(weddingId),
    ambilVendorOpsi(weddingId),
  ])
  return { kategori, vendor }
}