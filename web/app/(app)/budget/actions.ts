'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ambilPernikahanAktif } from '@/lib/pernikahan/kueri'
import { petakanGalat } from '@/lib/validasi/auth'
import {
  skemaIdKategori,
  skemaKategori,
  skemaUbahKategori,
} from '@/lib/validasi/budget'
import type { StatusForm } from '@/lib/validasi/status-form'

function ambil(formData: FormData, kunci: string): string {
  return String(formData.get(kunci) ?? '')
}

// wedding_id selalu diambil dari server, tidak pernah dari input form.
// RLS di database menjadi lapisan pengaman kedua.
async function ambilIdPernikahan(): Promise<string> {
  const pernikahan = await ambilPernikahanAktif()
  if (!pernikahan) redirect('/mulai')
  return pernikahan.id
}

export async function tambahKategori(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = {
    nama: ambil(formData, 'nama'),
    nilaiRencana: ambil(formData, 'nilaiRencana'),
    diLuarResepsi: ambil(formData, 'diLuarResepsi'),
  }

  const hasil = skemaKategori.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { error } = await supabase.from('budget_categories').insert({
    wedding_id: weddingId,
    nama: hasil.data.nama,
    nilai_rencana: hasil.data.nilaiRencana,
    di_luar_budget_resepsi: hasil.data.diLuarResepsi,
  })

  if (error) {
    console.error('[tambahKategori] gagal, kode:', error.code)
    if (error.code === '23505') {
      return { galatField: { nama: 'Nama kategori sudah dipakai' }, nilaiLama }
    }
    return { galat: 'Gagal menambah kategori. Coba lagi.', nilaiLama }
  }

  revalidatePath('/budget')
  return { info: 'Kategori ditambahkan.' }
}

export async function ubahKategori(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = {
    id: ambil(formData, 'id'),
    nama: ambil(formData, 'nama'),
    nilaiRencana: ambil(formData, 'nilaiRencana'),
  }

  const hasil = skemaUbahKategori.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  // select('id') dipakai untuk mendeteksi baris yang tidak terubah,
  // misalnya karena id bukan milik pernikahan ini
  const { data, error } = await supabase
    .from('budget_categories')
    .update({
      nama: hasil.data.nama,
      nilai_rencana: hasil.data.nilaiRencana,
    })
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)
    .select('id')

  if (error) {
    console.error('[ubahKategori] gagal, kode:', error.code)
    if (error.code === '23505') {
      return { galatField: { nama: 'Nama kategori sudah dipakai' }, nilaiLama }
    }
    return { galat: 'Gagal menyimpan perubahan. Coba lagi.', nilaiLama }
  }
  if (!data || data.length === 0) {
    return { galat: 'Kategori tidak ditemukan.', nilaiLama }
  }

  revalidatePath('/budget')
  return { info: 'Perubahan disimpan.' }
}

export async function hapusKategori(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const hasil = skemaIdKategori.safeParse({ id: ambil(formData, 'id') })
  if (!hasil.success) return { galat: 'Kategori tidak valid.' }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { error } = await supabase
    .from('budget_categories')
    .delete()
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)

  if (error) {
    console.error('[hapusKategori] gagal, kode:', error.code)
    // 23503: kategori masih dipakai pengeluaran (foreign key tanpa on delete)
    if (error.code === '23503') {
      return {
        galat:
          'Kategori ini masih punya pengeluaran. Pindahkan atau hapus pengeluarannya dulu.',
      }
    }
    return { galat: 'Gagal menghapus kategori. Coba lagi.' }
  }

  revalidatePath('/budget')
  return { info: 'Kategori dihapus.' }
}