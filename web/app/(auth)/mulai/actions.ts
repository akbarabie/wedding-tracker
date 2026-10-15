'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ambilPernikahanAktif } from '@/lib/pernikahan/kueri'
import { petakanGalat } from '@/lib/validasi/auth'
import { skemaBuatPernikahan, skemaUndangan } from '@/lib/validasi/pernikahan'
import type { StatusForm } from '@/lib/validasi/status-form'

// Mengambil nilai teks dari FormData dengan aman
function ambil(formData: FormData, kunci: string): string {
  return String(formData.get(kunci) ?? '')
}

export async function buatPernikahan(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nilaiLama = {
    namaPasangan: ambil(formData, 'namaPasangan'),
    tanggalHariH: ambil(formData, 'tanggalHariH'),
    budgetTotal: ambil(formData, 'budgetTotal'),
  }

  const hasil = skemaBuatPernikahan.safeParse(nilaiLama)
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  // Mencegah pernikahan ganda bila form sempat terkirim dari tab lain
  if (await ambilPernikahanAktif()) redirect('/')

  // Pernikahan dan keanggotaan owner dibuat dalam satu transaksi oleh fungsi database
  const supabase = await createClient()
  const { error } = await supabase.rpc('create_wedding', {
    p_nama_pasangan: hasil.data.namaPasangan,
    p_tanggal_hari_h: hasil.data.tanggalHariH,
    p_budget_total_resepsi: hasil.data.budgetTotal,
  })

  if (error) {
    // Hanya kode galat yang dicatat, tanpa data pribadi pengguna
    console.error('[buatPernikahan] gagal, kode:', error.code)
    return {
      galat: 'Gagal membuat pernikahan. Coba lagi beberapa saat.',
      nilaiLama,
    }
  }

  redirect('/')
}

export async function terimaUndangan(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const hasil = skemaUndangan.safeParse({
    undanganId: ambil(formData, 'undanganId'),
  })
  if (!hasil.success) {
    return { galat: 'Undangan tidak valid.' }
  }

  if (await ambilPernikahanAktif()) redirect('/')

  const supabase = await createClient()
  const { error } = await supabase.rpc('accept_wedding_invitation', {
    p_invitation_id: hasil.data.undanganId,
  })

  if (error) {
    console.error('[terimaUndangan] gagal, kode:', error.code)

    // Kode P0001 berasal dari raise exception di fungsi database kita sendiri,
    // pesannya sudah berbahasa Indonesia dan tidak memuat data pribadi.
    const pesan =
      error.code === 'P0001'
        ? error.message
        : 'Gagal menerima undangan. Coba lagi beberapa saat.'
    return { galat: pesan }
  }

  redirect('/')
}
