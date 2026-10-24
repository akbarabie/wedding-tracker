'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ambilPernikahanAktif } from '@/lib/pernikahan/kueri'
import { petakanGalat } from '@/lib/validasi/auth'
import { pesanGalat } from '@/lib/galat-db'
import {
  bacaFormTamu,
  skemaIdTamu,
  skemaTamu,
  skemaUbahStatusRsvp,
  skemaUbahTamu,
} from '@/lib/validasi/tamu'
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

// Tamu memengaruhi halaman tamu dan ringkasan (jumlah tamu terkonfirmasi)
function segarkan() {
  revalidatePath('/tamu')
  revalidatePath('/')
}

export async function tambahTamu(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = bacaFormTamu(formData)

  const hasil = skemaTamu.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { error } = await supabase.from('guests').insert({
    wedding_id: weddingId,
    nama: hasil.data.nama,
    kategori: hasil.data.kategori,
    kontak: hasil.data.kontak,
    jumlah_orang: hasil.data.jumlahOrang,
    status_rsvp: hasil.data.statusRsvp,
  })

  if (error) {
    console.error('[tambahTamu] gagal, kode:', error.code)
    // P0001 termasuk batas 1000 baris tamu per pernikahan
    return {
      galat: pesanGalat(error, 'Gagal menambah tamu. Coba lagi.'),
      nilaiLama,
    }
  }

  segarkan()
  return { info: 'Tamu ditambahkan.' }
}

export async function ubahTamu(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = { id: ambil(formData, 'id'), ...bacaFormTamu(formData) }

  const hasil = skemaUbahTamu.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  // select('id') dipakai untuk mendeteksi baris yang tidak terubah,
  // misalnya karena id bukan milik pernikahan ini
  const { data, error } = await supabase
    .from('guests')
    .update({
      nama: hasil.data.nama,
      kategori: hasil.data.kategori,
      kontak: hasil.data.kontak,
      jumlah_orang: hasil.data.jumlahOrang,
      status_rsvp: hasil.data.statusRsvp,
    })
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)
    .select('id')

  if (error) {
    console.error('[ubahTamu] gagal, kode:', error.code)
    return {
      galat: pesanGalat(error, 'Gagal menyimpan perubahan. Coba lagi.'),
      nilaiLama,
    }
  }
  if (!data || data.length === 0) {
    return { galat: 'Tamu tidak ditemukan.', nilaiLama }
  }

  segarkan()
  return { info: 'Perubahan disimpan.' }
}

// Ubah cepat status RSVP dari daftar tanpa membuka form
export async function ubahStatusRsvp(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const hasil = skemaUbahStatusRsvp.safeParse({
    id: ambil(formData, 'id'),
    statusRsvp: ambil(formData, 'statusRsvp'),
  })
  if (!hasil.success) return { galat: 'Status kehadiran tidak valid.' }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('guests')
    .update({ status_rsvp: hasil.data.statusRsvp })
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)
    .select('id')

  if (error) {
    console.error('[ubahStatusRsvp] gagal, kode:', error.code)
    return { galat: 'Gagal mengubah status. Coba lagi.' }
  }
  if (!data || data.length === 0) return { galat: 'Tamu tidak ditemukan.' }

  segarkan()
  return {}
}

export async function hapusTamu(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const hasil = skemaIdTamu.safeParse({ id: ambil(formData, 'id') })
  if (!hasil.success) return { galat: 'Tamu tidak valid.' }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)

  if (error) {
    console.error('[hapusTamu] gagal, kode:', error.code)
    return { galat: 'Gagal menghapus tamu. Coba lagi.' }
  }

  segarkan()
  return {}
}
