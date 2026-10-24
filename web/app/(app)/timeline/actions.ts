'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ambilPernikahanAktif } from '@/lib/pernikahan/kueri'
import { petakanGalat } from '@/lib/validasi/auth'
import { pesanGalat } from '@/lib/galat-db'
import {
  bacaFormTugas,
  skemaIdTugas,
  skemaTandaiTugas,
  skemaTugas,
  skemaUbahTugas,
} from '@/lib/validasi/timeline'
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

// Tugas memengaruhi halaman timeline dan ringkasan (progres checklist)
function segarkan() {
  revalidatePath('/timeline')
  revalidatePath('/')
}

// Galat database yang bisa dijelaskan ke pengguna. P0001 (aturan kita sendiri)
// diteruskan apa adanya lewat pesanGalat.
function pesanDatabase(kode: string | undefined, cadangan: string): string {
  // Foreign key komposit: penanggung jawab bukan anggota pernikahan ini
  if (kode === '23503') return 'Penanggung jawab harus anggota pernikahan ini.'
  return cadangan
}

export async function tambahTugas(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = bacaFormTugas(formData)

  const hasil = skemaTugas.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { error } = await supabase.from('timeline_tasks').insert({
    wedding_id: weddingId,
    judul: hasil.data.judul,
    fase: hasil.data.fase,
    deadline: hasil.data.deadline,
    penanggung_jawab: hasil.data.penanggungJawab,
  })

  if (error) {
    console.error('[tambahTugas] gagal, kode:', error.code)
    return {
      galat: pesanGalat(
        error,
        pesanDatabase(error.code, 'Gagal menambah tugas. Coba lagi.')
      ),
      nilaiLama,
    }
  }

  segarkan()
  return { info: 'Tugas ditambahkan.' }
}

export async function ubahTugas(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = { id: ambil(formData, 'id'), ...bacaFormTugas(formData) }

  const hasil = skemaUbahTugas.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  // select('id') dipakai untuk mendeteksi baris yang tidak terubah,
  // misalnya karena id bukan milik pernikahan ini
  const { data, error } = await supabase
    .from('timeline_tasks')
    .update({
      judul: hasil.data.judul,
      fase: hasil.data.fase,
      deadline: hasil.data.deadline,
      penanggung_jawab: hasil.data.penanggungJawab,
    })
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)
    .select('id')

  if (error) {
    console.error('[ubahTugas] gagal, kode:', error.code)
    return {
      galat: pesanGalat(
        error,
        pesanDatabase(error.code, 'Gagal menyimpan perubahan. Coba lagi.')
      ),
      nilaiLama,
    }
  }
  if (!data || data.length === 0) {
    return { galat: 'Tugas tidak ditemukan.', nilaiLama }
  }

  segarkan()
  return { info: 'Perubahan disimpan.' }
}

// Menandai selesai atau membuka lagi. selesai_pada diisi trigger di database,
// jadi di sini cukup mengirim nilai selesai.
export async function tandaiTugas(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const hasil = skemaTandaiTugas.safeParse({
    id: ambil(formData, 'id'),
    selesai: ambil(formData, 'selesai'),
  })
  if (!hasil.success) return { galat: 'Tugas tidak valid.' }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('timeline_tasks')
    .update({ selesai: hasil.data.selesai })
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)
    .select('id')

  if (error) {
    console.error('[tandaiTugas] gagal, kode:', error.code)
    return { galat: 'Gagal mengubah status tugas. Coba lagi.' }
  }
  if (!data || data.length === 0) return { galat: 'Tugas tidak ditemukan.' }

  segarkan()
  return {}
}

export async function hapusTugas(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const hasil = skemaIdTugas.safeParse({ id: ambil(formData, 'id') })
  if (!hasil.success) return { galat: 'Tugas tidak valid.' }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { error } = await supabase
    .from('timeline_tasks')
    .delete()
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)

  if (error) {
    console.error('[hapusTugas] gagal, kode:', error.code)
    return { galat: 'Gagal menghapus tugas. Coba lagi.' }
  }

  segarkan()
  return {}
}

// Menambahkan tugas template per fase untuk pernikahan yang sudah ada. Daftar tugasnya
// hidup di fungsi database isi_template_tugas, jadi sama persis dengan yang diisi saat
// pernikahan baru dibuat. Hanya tugas yang belum ada (berdasarkan judul) yang ditambahkan.
export async function isiTemplateTugas(): Promise<StatusForm> {
  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('isi_template_tugas', {
    p_wedding_id: weddingId,
  })

  if (error) {
    console.error('[isiTemplateTugas] gagal, kode:', error.code)
    // P0001 termasuk batas 300 tugas per pernikahan
    return { galat: pesanGalat(error, 'Gagal menambahkan template. Coba lagi.') }
  }

  segarkan()
  const jumlah = Number(data ?? 0)
  return {
    info:
      jumlah > 0
        ? `${jumlah} tugas template ditambahkan.`
        : 'Semua tugas template sudah ada.',
  }
}
