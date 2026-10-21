import { createClient } from '@/lib/supabase/server'
import type { FilterVendor } from '@/lib/validasi/filter-vendor'
import type { CaraHitung, JenisBiaya, Satuan, StatusVendor } from './label'

export type BiayaVendorBaris = {
  id: string
  nama: string
  jenis: JenisBiaya
  // Kosong bila tarifnya belum diketahui, hanya mungkin untuk jenis biaya
  nominal: number | null
  jumlah: number
  satuan_label: string | null
  wajib: boolean
}

export type Vendor = {
  id: string
  nama: string
  category_id: string | null
  lokasi: string | null
  kontak: string | null
  catatan_survei: string | null
  status: StatusVendor
  cara_hitung: CaraHitung
  satuan: Satuan | null
  harga_dasar: number | null
  jumlah_termasuk: number | null
  tarif_per_satuan: number | null
  minimum_unit: number | null
  maksimum_unit: number | null
  pajak_persen: number
  pajak_termasuk: boolean
  budget_categories: { nama: string } | null
  // Hanya terisi bila kueri meminta biaya tambahan
  vendor_biaya?: BiayaVendorBaris[]
}

const KOLOM =
  'id, nama, category_id, lokasi, kontak, catatan_survei, status, cara_hitung, satuan, harga_dasar, jumlah_termasuk, tarif_per_satuan, minimum_unit, maksimum_unit, pajak_persen, pajak_termasuk, budget_categories(nama)'

const KOLOM_DENGAN_BIAYA = `${KOLOM}, vendor_biaya(id, nama, jenis, nominal, jumlah, satuan_label, wajib)`

// denganBiaya dipakai halaman perbandingan dan detail, daftar biasa tidak membutuhkannya
export async function ambilDaftarVendor(
  weddingId: string,
  filter: FilterVendor = {},
  opsi: { denganBiaya?: boolean } = {}
): Promise<Vendor[]> {
  const supabase = await createClient()
  let kueri = supabase
    .from('vendors')
    .select(opsi.denganBiaya ? KOLOM_DENGAN_BIAYA : KOLOM)
    .eq('wedding_id', weddingId)

  // Filter dipasang sebelum order karena order mengubah tipe pembangun kueri
  if (filter.kategori) kueri = kueri.eq('category_id', filter.kategori)
  if (filter.status) kueri = kueri.eq('status', filter.status)

  const { data, error } = await kueri.order('created_at', { ascending: false })

  if (error) {
    console.error('[ambilDaftarVendor] gagal, kode:', error.code)
    throw new Error('Gagal membaca daftar vendor')
  }
  return (data ?? []) as unknown as Vendor[]
}

export async function ambilDetailVendor(
  weddingId: string,
  id: string
): Promise<Vendor | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vendors')
    .select(KOLOM_DENGAN_BIAYA)
    .eq('id', id)
    .eq('wedding_id', weddingId)
    .order('created_at', { referencedTable: 'vendor_biaya', ascending: true })
    .maybeSingle()

  if (error) {
    console.error('[ambilDetailVendor] gagal, kode:', error.code)
    throw new Error('Gagal membaca detail vendor')
  }
  return (data as unknown as Vendor | null) ?? null
}

export type RingkasanPengeluaranVendor = {
  jumlah: number
  totalNominal: number
  // Banyaknya pembayaran (DP atau cicilan) yang sudah ditandai dibayar
  jumlahPembayaranDibayar: number
}

// Ringkasan pengeluaran yang terhubung ke vendor, termasuk draf. Dipakai untuk
// menentukan apakah vendor boleh ditolak atau dihapus. Jumlah barisnya kecil
// (puluhan paling banyak) sehingga dihitung langsung di server aplikasi.
export async function ambilRingkasanPengeluaranVendor(
  weddingId: string,
  vendorId: string
): Promise<RingkasanPengeluaranVendor> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('nominal, payments(dibayar_pada)')
    .eq('wedding_id', weddingId)
    .eq('vendor_id', vendorId)

  if (error) {
    console.error('[ambilRingkasanPengeluaranVendor] gagal, kode:', error.code)
    throw new Error('Gagal membaca pengeluaran vendor')
  }

  const baris = (data ?? []) as unknown as {
    nominal: number
    payments: { dibayar_pada: string | null }[]
  }[]

  return {
    jumlah: baris.length,
    totalNominal: baris.reduce((t, b) => t + b.nominal, 0),
    jumlahPembayaranDibayar: baris.reduce(
      (t, b) => t + b.payments.filter((c) => c.dibayar_pada !== null).length,
      0
    ),
  }
}
