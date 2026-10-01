'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { petakanGalat, skemaDaftar, skemaMasuk } from '@/lib/validasi/auth'
import type { StatusForm } from '@/lib/validasi/status-form'

// Mengambil nilai teks dari FormData dengan aman
function ambil(formData: FormData, kunci: string): string {
  return String(formData.get(kunci) ?? '')
}

export async function daftar(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nama = ambil(formData, 'nama')
  const email = ambil(formData, 'email')
  const sandi = ambil(formData, 'sandi')

  const hasil = skemaDaftar.safeParse({ nama, email, sandi })
  if (!hasil.success) {
    return {
      galatField: petakanGalat(hasil.error.issues),
      nilaiLama: { nama, email },
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: hasil.data.email,
    password: hasil.data.sandi,
    // Nama disimpan di metadata pengguna Supabase Auth
    options: { data: { nama: hasil.data.nama } },
  })

  if (error) {
    // Hanya kode galat yang dicatat, tanpa data pribadi pengguna
    console.error('[daftar] pendaftaran gagal, kode:', error.code)

    let pesan = 'Pendaftaran gagal. Coba lagi beberapa saat.'
    if (error.code === 'user_already_exists') {
      pesan = 'Email ini sudah terdaftar. Silakan masuk.'
    } else if (error.code === 'weak_password') {
      pesan = 'Kata sandi terlalu lemah. Gunakan kombinasi yang lebih panjang.'
    } else if (
      error.code === 'over_request_rate_limit' ||
      error.code === 'over_email_send_rate_limit'
    ) {
      pesan = 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.'
    }
    return { galat: pesan, nilaiLama: { nama, email } }
  }

  // Sesi kosong berarti konfirmasi email masih aktif di Supabase
  if (!data.session) {
    return {
      galat: 'Akun dibuat. Silakan cek email untuk konfirmasi, lalu masuk.',
      nilaiLama: { nama, email },
    }
  }

  redirect('/')
}

export async function masuk(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const email = ambil(formData, 'email')
  const sandi = ambil(formData, 'sandi')

  const hasil = skemaMasuk.safeParse({ email, sandi })
  if (!hasil.success) {
    return {
      galatField: petakanGalat(hasil.error.issues),
      nilaiLama: { email },
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: hasil.data.email,
    password: hasil.data.sandi,
  })

  if (error) {
    console.error('[masuk] gagal masuk, kode:', error.code)

    // Pesan sengaja sama untuk email salah maupun sandi salah
    const pesan =
      error.code === 'over_request_rate_limit'
        ? 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
        : 'Email atau kata sandi salah.'
    return { galat: pesan, nilaiLama: { email } }
  }

  redirect('/')
}

export async function keluar() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/masuk')
}