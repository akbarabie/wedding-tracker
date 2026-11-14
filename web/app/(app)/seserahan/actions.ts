'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ambilPernikahanAktif } from '@/lib/pernikahan/kueri'
import { petakanGalat } from '@/lib/validasi/auth'
import { pesanGalat } from '@/lib/galat-db'
import {
  bacaFormSeserahan,
  skemaIdItemSeserahan,
  skemaItemSeserahan,
  skemaUbahItemSeserahan,
  skemaUbahStatusSeserahan,
} from '@/lib/validasi/seserahan'
import type { StatusForm } from '@/lib/validasi/status-form'

function ambil(formData: FormData, kunci: string): string {
  return String(formData.get(kunci) ?? '')
}

// wedding_id selalu dari server, tidak pernah dari input form.
// RLS di database menjadi lapisan pengaman kedua.
async function ambilIdPernikahan(): Promise<string> {
  const pernikahan = await ambilPernikahanAktif()
  if (!pernikahan) redirect('/mulai')
  return pernikahan.id
}

// Seserahan memengaruhi halaman seserahan dan ringkasan (progres dan estimasi biaya)
function segarkan() {
  revalidatePath('/seserahan')
  revalidatePath('/')
}

export async function tambahItemSeserahan(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = bacaFormSeserahan(formData)

  const hasil = skemaItemSeserahan.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { error } = await supabase.from('seserahan_items').insert({
    wedding_id: weddingId,
    kategori: hasil.data.kategori,
    judul: hasil.data.judul,
    status: hasil.data.status,
    vendor: hasil.data.vendor,
    link_toko: hasil.data.linkToko,
    estimasi_harga: hasil.data.estimasiHarga,
  })

  if (error) {
    console.error('[tambahItemSeserahan] gagal, kode:', error.code)
    // P0001 termasuk batas 300 item per pernikahan
    return {
      galat: pesanGalat(error, 'Gagal menambah item. Coba lagi.'),
      nilaiLama,
    }
  }

  segarkan()
  return { info: 'Item ditambahkan.' }
}

export async function ubahItemSeserahan(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = { id: ambil(formData, 'id'), ...bacaFormSeserahan(formData) }

  const hasil = skemaUbahItemSeserahan.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  // select('id') dipakai untuk mendeteksi baris yang tidak terubah,
  // misalnya karena id bukan milik pernikahan ini
  const { data, error } = await supabase
    .from('seserahan_items')
    .update({
      kategori: hasil.data.kategori,
      judul: hasil.data.judul,
      status: hasil.data.status,
      vendor: hasil.data.vendor,
      link_toko: hasil.data.linkToko,
      estimasi_harga: hasil.data.estimasiHarga,
    })
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)
    .select('id')

  if (error) {
    console.error('[ubahItemSeserahan] gagal, kode:', error.code)
    return {
      galat: pesanGalat(error, 'Gagal menyimpan perubahan. Coba lagi.'),
      nilaiLama,
    }
  }
  if (!data || data.length === 0) {
    return { galat: 'Item tidak ditemukan.', nilaiLama }
  }

  segarkan()
  return { info: 'Perubahan disimpan.' }
}

// Ubah cepat status dari daftar tanpa membuka form
export async function ubahStatusSeserahan(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const hasil = skemaUbahStatusSeserahan.safeParse({
    id: ambil(formData, 'id'),
    status: ambil(formData, 'status'),
  })
  if (!hasil.success) return { galat: 'Status tidak valid.' }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('seserahan_items')
    .update({ status: hasil.data.status })
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)
    .select('id')

  if (error) {
    console.error('[ubahStatusSeserahan] gagal, kode:', error.code)
    return { galat: 'Gagal mengubah status. Coba lagi.' }
  }
  if (!data || data.length === 0) return { galat: 'Item tidak ditemukan.' }

  segarkan()
  return {}
}

export async function hapusItemSeserahan(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const hasil = skemaIdItemSeserahan.safeParse({ id: ambil(formData, 'id') })
  if (!hasil.success) return { galat: 'Item tidak valid.' }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { error } = await supabase
    .from('seserahan_items')
    .delete()
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)

  if (error) {
    console.error('[hapusItemSeserahan] gagal, kode:', error.code)
    return { galat: 'Gagal menghapus item. Coba lagi.' }
  }

  segarkan()
  return {}
}

// Menambahkan item template untuk pernikahan yang sudah ada. Daftarnya hidup di fungsi
// database isi_template_seserahan. Hanya item yang belum ada yang ditambahkan.
export async function isiTemplateSeserahan(): Promise<StatusForm> {
  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('isi_template_seserahan', {
    p_wedding_id: weddingId,
  })

  if (error) {
    console.error('[isiTemplateSeserahan] gagal, kode:', error.code)
    return { galat: pesanGalat(error, 'Gagal menambahkan template. Coba lagi.') }
  }

  segarkan()
  const jumlah = Number(data ?? 0)
  return {
    info:
      jumlah > 0
        ? `${jumlah} item template ditambahkan.`
        : 'Semua item template sudah ada.',
  }
}
