'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ambilPernikahanAktif } from '@/lib/pernikahan/kueri'
import { petakanGalat } from '@/lib/validasi/auth'
import { buatSkemaUbahPernikahan } from '@/lib/validasi/pernikahan'
import type { StatusForm } from '@/lib/validasi/status-form'

function ambil(formData: FormData, kunci: string): string {
  return String(formData.get(kunci) ?? '')
}

export async function ubahPernikahan(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = {
    namaPasangan: ambil(formData, 'namaPasangan'),
    tanggalHariH: ambil(formData, 'tanggalHariH'),
    budgetTotal: ambil(formData, 'budgetTotal'),
  }

  // id pernikahan dan hari H saat ini selalu dari server, tidak pernah dari form.
  // RLS di database menjadi lapisan pengaman kedua.
  const pernikahan = await ambilPernikahanAktif()
  if (!pernikahan) redirect('/mulai')

  const hasil = buatSkemaUbahPernikahan(pernikahan.tanggal_hari_h).safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  const supabase = await createClient()
  // select('id') dipakai untuk mendeteksi pembaruan yang tidak mengenai baris apa pun
  const { data, error } = await supabase
    .from('weddings')
    .update({
      nama_pasangan: hasil.data.namaPasangan,
      tanggal_hari_h: hasil.data.tanggalHariH,
      budget_total_resepsi: hasil.data.budgetTotal,
    })
    .eq('id', pernikahan.id)
    .select('id')

  if (error) {
    console.error('[ubahPernikahan] gagal, kode:', error.code)
    return { galat: 'Gagal menyimpan pengaturan. Coba lagi.', nilaiLama }
  }
  if (!data || data.length === 0) {
    return { galat: 'Pernikahan tidak ditemukan.', nilaiLama }
  }

  // Nama, hari H, dan budget dipakai hampir di semua halaman (hitung mundur timeline,
  // ringkasan budget), jadi seluruh layout disegarkan
  revalidatePath('/', 'layout')
  return { info: 'Pengaturan disimpan.' }
}
