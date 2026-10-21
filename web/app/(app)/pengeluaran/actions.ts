'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ambilPernikahanAktif } from '@/lib/pernikahan/kueri'
import { petakanGalat } from '@/lib/validasi/auth'
import { pesanGalat } from '@/lib/galat-db'
import { hariIniWib } from '@/lib/validasi/pernikahan'
import { susunJadwal, type JenisPembayaran } from '@/lib/pengeluaran/jadwal'
import {
  VENDOR_BARU,
  skemaIdCicilan,
  skemaJadwal,
  skemaIdPengeluaran,
  skemaPengeluaran,
  skemaStatusCicilan,
  skemaUbahPengeluaran,
} from '@/lib/validasi/pengeluaran'
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

// Pengeluaran memengaruhi daftar, detail, ringkasan budget, dan status vendor
// (vendor otomatis berstatus deal saat pengeluarannya tercatat)
function segarkan() {
  revalidatePath('/pengeluaran', 'layout')
  revalidatePath('/budget')
  revalidatePath('/vendor', 'layout')
}

export async function buatPengeluaran(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = {
    kategoriId: ambil(formData, 'kategoriId'),
    vendorId: ambil(formData, 'vendorId'),
    vendorBaru: ambil(formData, 'vendorBaru'),
    deskripsi: ambil(formData, 'deskripsi'),
    nominal: ambil(formData, 'nominal'),
    tanggal: ambil(formData, 'tanggal'),
  }

  const hasil = skemaPengeluaran.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const d = hasil.data
  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const pakaiVendorBaru = d.vendorId === VENDOR_BARU

  const { data, error } = await supabase.rpc('buat_pengeluaran', {
    p_wedding_id: weddingId,
    p_category_id: d.kategoriId,
    p_vendor_id: pakaiVendorBaru ? null : d.vendorId,
    p_vendor_baru: pakaiVendorBaru ? d.vendorBaru : null,
    p_deskripsi: d.deskripsi,
    p_nominal: d.nominal,
    p_tanggal: d.tanggal,
  })

  if (error) {
    console.error('[buatPengeluaran] gagal, kode:', error.code)
    // 23503: kategori atau vendor bukan milik pernikahan ini
    const cadangan =
      error.code === '23503'
        ? 'Kategori atau vendor tidak valid.'
        : 'Gagal menyimpan pengeluaran. Coba lagi.'
    return { galat: pesanGalat(error, cadangan), nilaiLama }
  }

  segarkan()
  redirect(`/pengeluaran/${data}`)
}

export async function ubahPengeluaran(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = {
    id: ambil(formData, 'id'),
    kategoriId: ambil(formData, 'kategoriId'),
    deskripsi: ambil(formData, 'deskripsi'),
    nominal: ambil(formData, 'nominal'),
    tanggal: ambil(formData, 'tanggal'),
  }

  const hasil = skemaUbahPengeluaran.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const d = hasil.data
  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .update({
      category_id: d.kategoriId,
      deskripsi: d.deskripsi,
      nominal: d.nominal,
      tanggal: d.tanggal,
    })
    .eq('id', d.id)
    .eq('wedding_id', weddingId)
    .select('id')

  if (error) {
    console.error('[ubahPengeluaran] gagal, kode:', error.code)
    return {
      galat: pesanGalat(error, 'Gagal menyimpan perubahan. Coba lagi.'),
      nilaiLama,
    }
  }
  if (!data || data.length === 0) {
    return { galat: 'Pengeluaran tidak ditemukan.', nilaiLama }
  }

  segarkan()
  return { info: 'Perubahan disimpan.' }
}

export async function hapusPengeluaran(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const hasil = skemaIdPengeluaran.safeParse({ id: ambil(formData, 'id') })
  if (!hasil.success) return { galat: 'Pengeluaran tidak valid.' }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  // Cicilan ikut terhapus lewat on delete cascade di database
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)

  if (error) {
    console.error('[hapusPengeluaran] gagal, kode:', error.code)
    return { galat: 'Gagal menghapus pengeluaran. Coba lagi.' }
  }

  segarkan()
  redirect('/pengeluaran')
}

export async function tambahPembayaran(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = {
    expenseId: ambil(formData, 'expenseId'),
    jenis: ambil(formData, 'jenis'),
    nominalDp: ambil(formData, 'nominalDp'),
    jumlahCicilan: ambil(formData, 'jumlahCicilan'),
    jatuhTempo: ambil(formData, 'jatuhTempo'),
    dibayarPada: ambil(formData, 'dibayarPada'),
  }

  // Nilai jenis di luar tiga pilihan hanya mungkin dari permintaan yang dimanipulasi
  if (!['dp', 'cicilan', 'pelunasan'].includes(nilaiLama.jenis)) {
    return { galatField: { jenis: 'Pilih jenis pembayaran' }, nilaiLama }
  }

  const hasil = skemaJadwal.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const d = hasil.data
  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()

  // Keadaan pembayaran dibaca dari database, bukan dari form, supaya hitungan
  // sisa selalu mengikuti data terbaru dan tidak bisa dipalsukan dari browser.
  const { data, error: galatBaca } = await supabase
    .from('expenses')
    .select('nominal, payments(jenis, nominal)')
    .eq('id', d.expenseId)
    .eq('wedding_id', weddingId)
    .eq('status_entri', 'final')
    .maybeSingle()

  if (galatBaca) {
    console.error('[tambahPembayaran] baca gagal, kode:', galatBaca.code)
    return { galat: 'Gagal membaca data pengeluaran. Coba lagi.', nilaiLama }
  }
  if (!data) return { galat: 'Pengeluaran tidak ditemukan.', nilaiLama }

  const pengeluaran = data as unknown as {
    nominal: number
    payments: { jenis: JenisPembayaran; nominal: number }[]
  }
  const ada = pengeluaran.payments ?? []
  const dijadwalkan = ada.reduce((total, c) => total + c.nominal, 0)

  const jadwal = susunJadwal(d, {
    belumDijadwalkan: pengeluaran.nominal - dijadwalkan,
    adaDp: ada.some((c) => c.jenis === 'dp'),
    adaPelunasan: ada.some((c) => c.jenis === 'pelunasan'),
    jumlahCicilan: ada.filter((c) => c.jenis === 'cicilan').length,
  })
  if ('galat' in jadwal) return { galat: jadwal.galat, nilaiLama }

  // Semua baris masuk dalam satu perintah insert, jadi berhasil seluruhnya
  // atau tidak sama sekali.
  const { error } = await supabase.from('payments').insert(
    jadwal.baris.map((b) => ({
      wedding_id: weddingId,
      expense_id: d.expenseId,
      jenis: b.jenis,
      label: b.label,
      nominal: b.nominal,
      jatuh_tempo: b.jatuh_tempo,
      dibayar_pada: b.dibayar_pada,
    }))
  )

  if (error) {
    console.error('[tambahPembayaran] simpan gagal, kode:', error.code)
    // 23505: unique index DP atau pelunasan menahan data ganda (misalnya klik ganda)
    const cadangan =
      error.code === '23505'
        ? 'DP atau pelunasan untuk pengeluaran ini sudah ada.'
        : 'Gagal menyimpan pembayaran. Coba lagi.'
    return { galat: pesanGalat(error, cadangan), nilaiLama }
  }

  segarkan()
  return {
    info:
      jadwal.baris.length === 1
        ? 'Pembayaran ditambahkan.'
        : `${jadwal.baris.length} pembayaran ditambahkan.`,
  }
}

export async function ubahStatusCicilan(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const hasil = skemaStatusCicilan.safeParse({
    id: ambil(formData, 'id'),
    dibayar: ambil(formData, 'dibayar'),
  })
  if (!hasil.success) return { galat: 'Cicilan tidak valid.' }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .update({ dibayar_pada: hasil.data.dibayar === '1' ? hariIniWib() : null })
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)
    .select('id')

  if (error) {
    console.error('[ubahStatusCicilan] gagal, kode:', error.code)
    // Misalnya vendor sudah ditolak sehingga pembayaran tidak boleh ditandai dibayar
    return { galat: pesanGalat(error, 'Gagal memperbarui cicilan. Coba lagi.') }
  }
  if (!data || data.length === 0) return { galat: 'Cicilan tidak ditemukan.' }

  segarkan()
  return {}
}

export async function hapusCicilan(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const hasil = skemaIdCicilan.safeParse({ id: ambil(formData, 'id') })
  if (!hasil.success) return { galat: 'Cicilan tidak valid.' }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)

  if (error) {
    console.error('[hapusCicilan] gagal, kode:', error.code)
    return { galat: 'Gagal menghapus cicilan. Coba lagi.' }
  }

  segarkan()
  return {}
}