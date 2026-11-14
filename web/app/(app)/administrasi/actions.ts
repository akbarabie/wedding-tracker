'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ambilPernikahanAktif } from '@/lib/pernikahan/kueri'
import { petakanGalat } from '@/lib/validasi/auth'
import { pesanGalat } from '@/lib/galat-db'
import {
  bacaFormDokumen,
  skemaDokumen,
  skemaIdDokumen,
  skemaTandaiDokumen,
  skemaUbahDokumen,
} from '@/lib/validasi/administrasi'
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

// Dokumen memengaruhi halaman administrasi dan ringkasan (progres berkas)
function segarkan() {
  revalidatePath('/administrasi')
  revalidatePath('/')
}

export async function tambahDokumen(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = bacaFormDokumen(formData)

  const hasil = skemaDokumen.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { error } = await supabase.from('admin_documents').insert({
    wedding_id: weddingId,
    judul: hasil.data.judul,
    berlaku_untuk: hasil.data.berlakuUntuk,
    catatan: hasil.data.catatan,
  })

  if (error) {
    console.error('[tambahDokumen] gagal, kode:', error.code)
    // P0001 termasuk batas 100 dokumen per pernikahan
    return {
      galat: pesanGalat(error, 'Gagal menambah dokumen. Coba lagi.'),
      nilaiLama,
    }
  }

  segarkan()
  return { info: 'Dokumen ditambahkan.' }
}

export async function ubahDokumen(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = { id: ambil(formData, 'id'), ...bacaFormDokumen(formData) }

  const hasil = skemaUbahDokumen.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()

  // Status pihak yang tidak lagi berlaku harus dikembalikan ke belum selesai.
  // Tanpa ini database menolak perubahan karena CHECK pada kolom status pihak.
  const reset: { selesai_cpp?: boolean; selesai_cpw?: boolean } = {}
  if (hasil.data.berlakuUntuk === 'cpw') reset.selesai_cpp = false
  if (hasil.data.berlakuUntuk === 'cpp') reset.selesai_cpw = false

  // select('id') dipakai untuk mendeteksi baris yang tidak terubah,
  // misalnya karena id bukan milik pernikahan ini
  const { data, error } = await supabase
    .from('admin_documents')
    .update({
      judul: hasil.data.judul,
      berlaku_untuk: hasil.data.berlakuUntuk,
      catatan: hasil.data.catatan,
      ...reset,
    })
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)
    .select('id')

  if (error) {
    console.error('[ubahDokumen] gagal, kode:', error.code)
    return {
      galat: pesanGalat(error, 'Gagal menyimpan perubahan. Coba lagi.'),
      nilaiLama,
    }
  }
  if (!data || data.length === 0) {
    return { galat: 'Dokumen tidak ditemukan.', nilaiLama }
  }

  segarkan()
  return { info: 'Perubahan disimpan.' }
}

// Mencentang atau membatalkan status satu pihak pada satu dokumen
export async function tandaiDokumen(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const hasil = skemaTandaiDokumen.safeParse({
    id: ambil(formData, 'id'),
    pihak: ambil(formData, 'pihak'),
    selesai: ambil(formData, 'selesai'),
  })
  if (!hasil.success) return { galat: 'Dokumen tidak valid.' }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const kolom = hasil.data.pihak === 'cpp' ? 'selesai_cpp' : 'selesai_cpw'
  const { data, error } = await supabase
    .from('admin_documents')
    .update({ [kolom]: hasil.data.selesai })
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)
    .select('id')

  if (error) {
    console.error('[tandaiDokumen] gagal, kode:', error.code)
    // 23514: pihak ini memang tidak termasuk dalam berlaku_untuk dokumen
    return {
      galat:
        error.code === '23514'
          ? 'Dokumen ini tidak berlaku untuk pihak tersebut.'
          : 'Gagal mengubah status dokumen. Coba lagi.',
    }
  }
  if (!data || data.length === 0) return { galat: 'Dokumen tidak ditemukan.' }

  segarkan()
  return {}
}

export async function hapusDokumen(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const hasil = skemaIdDokumen.safeParse({ id: ambil(formData, 'id') })
  if (!hasil.success) return { galat: 'Dokumen tidak valid.' }

  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { error } = await supabase
    .from('admin_documents')
    .delete()
    .eq('id', hasil.data.id)
    .eq('wedding_id', weddingId)

  if (error) {
    console.error('[hapusDokumen] gagal, kode:', error.code)
    return { galat: 'Gagal menghapus dokumen. Coba lagi.' }
  }

  segarkan()
  return {}
}

// Menambahkan dokumen template untuk pernikahan yang sudah ada. Daftarnya hidup di fungsi
// database isi_template_administrasi. Hanya dokumen yang judulnya belum ada yang ditambahkan.
export async function isiTemplateAdministrasi(): Promise<StatusForm> {
  const weddingId = await ambilIdPernikahan()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('isi_template_administrasi', {
    p_wedding_id: weddingId,
  })

  if (error) {
    console.error('[isiTemplateAdministrasi] gagal, kode:', error.code)
    return { galat: pesanGalat(error, 'Gagal menambahkan template. Coba lagi.') }
  }

  segarkan()
  const jumlah = Number(data ?? 0)
  return {
    info:
      jumlah > 0
        ? `${jumlah} dokumen template ditambahkan.`
        : 'Semua dokumen template sudah ada.',
  }
}
