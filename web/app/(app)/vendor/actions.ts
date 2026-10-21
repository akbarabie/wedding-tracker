'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ambilPernikahanAktif } from '@/lib/pernikahan/kueri'
import { petakanGalat } from '@/lib/validasi/auth'
import { pesanGalat } from '@/lib/galat-db'
import {
  bacaFormVendor,
  skemaBiaya,
  skemaIdBiaya,
  skemaIdVendor,
  skemaUbahVendor,
  skemaVendor,
  type DataVendor,
} from '@/lib/validasi/vendor'
import type { StatusForm } from '@/lib/validasi/status-form'

function ambil(formData: FormData, kunci: string): string {
  return String(formData.get(kunci) ?? '')
}

// wedding_id selalu dari server, tidak pernah dari input form
async function ambilIdPernikahan(): Promise<string> {
  const pernikahan = await ambilPernikahanAktif()
  if (!pernikahan) redirect('/mulai')
  return pernikahan.id
}

// Vendor memengaruhi daftar vendor dan nama vendor di daftar pengeluaran
function segarkan() {
  revalidatePath('/vendor', 'layout')
  revalidatePath('/pengeluaran', 'layout')
}

// Kolom vendor di database, dipakai bersama oleh tambah dan ubah
function kolomVendor(d: DataVendor) {
  return {
    category_id: d.kategoriId,
    nama: d.nama,
    lokasi: d.lokasi,
    kontak: d.kontak,
    catatan_survei: d.catatanSurvei,
    status: d.status,
    cara_hitung: d.caraHitung,
    satuan: d.satuan,
    harga_dasar: d.hargaDasar,
    jumlah_termasuk: d.jumlahTermasuk,
    tarif_per_satuan: d.tarifPerSatuan,
    minimum_unit: d.minimumUnit,
    maksimum_unit: d.maksimumUnit,
    pajak_persen: d.pajakPersen,
    pajak_termasuk: d.pajakTermasuk,
  }
}

function pesanDatabase(kode: string | undefined, cadangan: string): string {
  if (kode === '23503') return 'Kategori tidak valid.'
  // Constraint keterkaitan kolom harga, hanya terlihat bila validasi di atasnya terlewati
  if (kode === '23514') return 'Isian harga tidak konsisten. Periksa cara hitung dan satuannya.'
  return cadangan
}

export async function tambahVendor(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = bacaFormVendor(formData)

  const hasil = skemaVendor.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vendors')
    .insert({ wedding_id: weddingId, ...kolomVendor(hasil.data) })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[tambahVendor] gagal, kode:', error?.code)
    return {
      galat: pesanDatabase(error?.code, 'Gagal menyimpan vendor. Coba lagi.'),
      nilaiLama,
    }
  }

  segarkan()
  redirect(`/vendor/${data.id}`)
}

export async function ubahVendor(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = { id: ambil(formData, 'id'), ...bacaFormVendor(formData) }

  const hasil = skemaUbahVendor.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vendors')
    .update(kolomVendor(hasil.data))
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)
    .select('id')

  if (error) {
    console.error('[ubahVendor] gagal, kode:', error.code)
    // P0001 termasuk aturan status vendor dikunci sebagai deal bila ada pembayaran dibayar
    return {
      galat: pesanGalat(
        error,
        pesanDatabase(error.code, 'Gagal menyimpan perubahan. Coba lagi.')
      ),
      nilaiLama,
    }
  }
  if (!data || data.length === 0) {
    return { galat: 'Vendor tidak ditemukan.', nilaiLama }
  }

  segarkan()
  return { info: 'Perubahan disimpan.' }
}

// Penghapusan dijalankan lewat fungsi database hapus_vendor supaya atomik:
// vendor ditolak tanpa pembayaran dibayar dihapus bersama pengeluarannya dalam satu
// transaksi. Aturan siapa yang boleh dihapus ditegakkan di database, bukan hanya di sini.
export async function hapusVendor(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const hasil = skemaIdVendor.safeParse({ id: ambil(formData, 'id') })
  if (!hasil.success) return { galat: 'Vendor tidak valid.' }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { error } = await supabase.rpc('hapus_vendor', {
    p_wedding_id: weddingId,
    p_vendor_id: hasil.data.id,
  })

  if (error) {
    console.error('[hapusVendor] gagal, kode:', error.code)
    return { galat: pesanGalat(error, 'Gagal menghapus vendor. Coba lagi.') }
  }

  segarkan()
  redirect('/vendor')
}

// ---------- Biaya tambahan ----------

export async function tambahBiaya(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = {
    vendorId: ambil(formData, 'vendorId'),
    nama: ambil(formData, 'nama'),
    jenis: ambil(formData, 'jenis'),
    nominal: ambil(formData, 'nominal'),
    jumlah: ambil(formData, 'jumlah'),
    satuanLabel: ambil(formData, 'satuanLabel'),
    wajib: ambil(formData, 'wajib'),
  }

  const hasil = skemaBiaya.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const d = hasil.data
  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { error } = await supabase.from('vendor_biaya').insert({
    wedding_id: weddingId,
    vendor_id: d.vendorId,
    nama: d.nama,
    jenis: d.jenis,
    nominal: d.nominal,
    jumlah: d.jumlah,
    satuan_label: d.satuanLabel,
    wajib: d.wajib,
  })

  if (error) {
    console.error('[tambahBiaya] gagal, kode:', error.code)
    // 23503: vendor bukan milik pernikahan ini. P0001: batas 30 biaya per vendor.
    const cadangan =
      error.code === '23503'
        ? 'Vendor tidak ditemukan.'
        : 'Gagal menyimpan biaya. Coba lagi.'
    return { galat: pesanGalat(error, cadangan), nilaiLama }
  }

  segarkan()
  return { info: 'Biaya tambahan ditambahkan.' }
}

export async function hapusBiaya(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const hasil = skemaIdBiaya.safeParse({ id: ambil(formData, 'id') })
  if (!hasil.success) return { galat: 'Biaya tidak valid.' }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { error } = await supabase
    .from('vendor_biaya')
    .delete()
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)

  if (error) {
    console.error('[hapusBiaya] gagal, kode:', error.code)
    return { galat: 'Gagal menghapus biaya. Coba lagi.' }
  }

  segarkan()
  return {}
}
