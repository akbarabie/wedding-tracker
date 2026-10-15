'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MASA_BERLAKU_TAUTAN } from '@/lib/auth/masa-berlaku'
import { cekStatusEmail, type StatusEmail } from '@/lib/auth/status-email'
import { verifikasiTurnstile } from '@/lib/keamanan/turnstile'
import {
  petakanGalat,
  skemaAturUlangSandi,
  skemaDaftar,
  skemaLupaSandi,
  skemaMasuk,
} from '@/lib/validasi/auth'
import type { StatusForm } from '@/lib/validasi/status-form'
import { hapusAkunBelumVerifikasi } from '@/lib/auth/hapus-akun-belum-verifikasi'

const PESAN_BATAS_LAJU =
  'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.'
const PESAN_GANGGUAN = 'Terjadi gangguan pada server. Coba lagi beberapa saat.'
const PESAN_CAPTCHA =
  'Verifikasi keamanan belum selesai atau sudah kedaluwarsa. Tunggu sebentar sampai kotak verifikasi menyala, lalu coba lagi.'

// Memeriksa token Turnstile yang dikirim form. Dipanggil sebelum pengecekan
// email atau pengiriman email apa pun, supaya bot tidak bisa menguras kuota Brevo
// atau menebak email yang sudah terdaftar.
async function lolosCaptcha(formData: FormData): Promise<boolean> {
  return verifikasiTurnstile(String(formData.get('cf-turnstile-response') ?? ''))
}

// Mengambil nilai teks dari FormData dengan aman
function ambil(formData: FormData, kunci: string): string {
  return String(formData.get(kunci) ?? '')
}

// Kode galat Supabase yang berarti pengguna terlalu sering mencoba
function adalahBatasLaju(kode?: string): boolean {
  return (
    kode === 'over_request_rate_limit' || kode === 'over_email_send_rate_limit'
  )
}

// Membungkus pengecekan status email. Bila database bermasalah, hasilnya null
// dan pemanggil menampilkan pesan gangguan, bukan melanjutkan dengan asumsi.
async function periksaEmail(email: string): Promise<StatusEmail | null> {
  try {
    return await cekStatusEmail(email)
  } catch {
    return null
  }
}

export async function daftar(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const nama = ambil(formData, 'nama')
  const email = ambil(formData, 'email')
  const sandi = ambil(formData, 'sandi')
  const nilaiLama = { nama, email }

  const hasil = skemaDaftar.safeParse({ nama, email, sandi })
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  if (!(await lolosCaptcha(formData))) {
    return { galat: PESAN_CAPTCHA, nilaiLama }
  }

  // Email dicek lebih dulu. Dengan verifikasi email aktif, signUp sendiri tidak
  // memberi galat untuk email yang sudah ada, jadi pengecekan harus dilakukan di sini.
  const statusEmail = await periksaEmail(hasil.data.email)
  if (!statusEmail) return { galat: PESAN_GANGGUAN, nilaiLama }

  if (statusEmail === 'terverifikasi') {
    return { galat: 'Email ini sudah terdaftar. Silakan masuk.', nilaiLama }
  }

  const supabase = await createClient()

    // Email pernah didaftarkan tetapi tautannya belum dipakai. Akun lama sengaja
  // TIDAK dipakai ulang, karena bisa saja dibuat pihak lain dengan kata sandi
  // yang tidak diketahui pemilik email (pre-account takeover). Akun itu dihapus
  // lalu dibuat ulang di bawah memakai kata sandi dan nama dari pendaftar sekarang.
  if (statusEmail === 'belum_verifikasi') {
    let dihapus = false
    try {
      dihapus = await hapusAkunBelumVerifikasi(hasil.data.email)
    } catch {
      return { galat: PESAN_GANGGUAN, nilaiLama }
    }

    // Status berubah di antara pengecekan dan penghapusan, misalnya tautan
    // verifikasi baru saja dipakai. Jangan lanjut signUp, minta coba ulang.
    if (!dihapus) {
      return {
        galat: 'Status email ini baru saja berubah. Muat ulang halaman lalu coba lagi.',
        nilaiLama,
      }
    }
  }

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
    } else if (adalahBatasLaju(error.code)) {
      pesan = PESAN_BATAS_LAJU
    }
    return { galat: pesan, nilaiLama }
  }

  // Sesi kosong berarti verifikasi email aktif di Supabase dan akun belum bisa dipakai
  if (!data.session) {
    return {
      info: `Hampir selesai. Kami mengirim tautan verifikasi ke emailmu dan tautan itu berlaku selama ${MASA_BERLAKU_TAUTAN}. Buka email itu lalu klik tautannya, dan cek folder spam bila belum masuk.`,
      nilaiLama,
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

  if (!(await lolosCaptcha(formData))) {
    return { galat: PESAN_CAPTCHA, nilaiLama: { email } }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: hasil.data.email,
    password: hasil.data.sandi,
  })

  if (error) {
    console.error('[masuk] gagal masuk, kode:', error.code)

    // Pesan sengaja sama untuk email salah maupun sandi salah.
    // Pengecualian: email belum diverifikasi, karena Supabase hanya memberi
    // tahu ini setelah email dan sandi cocok.
    let pesan = 'Email atau kata sandi salah.'
    if (error.code === 'over_request_rate_limit') {
      pesan = 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
    } else if (error.code === 'email_not_confirmed') {
      pesan =
        'Email belum diverifikasi. Buka email dari kami lalu klik tautan verifikasinya.'
    }
    return { galat: pesan, nilaiLama: { email } }
  }

  redirect('/')
}

export async function keluar() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/masuk')
}

export async function mintaResetSandi(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const email = ambil(formData, 'email')
  const nilaiLama = { email }

  const hasil = skemaLupaSandi.safeParse({ email })
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues), nilaiLama }
  }

  if (!(await lolosCaptcha(formData))) {
    return { galat: PESAN_CAPTCHA, nilaiLama }
  }

  // Email dicek lebih dulu agar tidak ada email yang terbuang ke alamat
  // yang tidak terdaftar, sekaligus menghemat kuota kirim Brevo.
  const statusEmail = await periksaEmail(hasil.data.email)
  if (!statusEmail) return { galat: PESAN_GANGGUAN, nilaiLama }

  if (statusEmail === 'tidak_ada') {
    return {
      galat:
        'Email ini belum terdaftar. Periksa penulisannya, atau daftar akun baru.',
      nilaiLama,
    }
  }

  if (statusEmail === 'belum_verifikasi') {
    return {
      galat:
        'Email ini belum diverifikasi, jadi kata sandinya belum bisa diatur ulang. Daftar ulang dengan email yang sama untuk meminta tautan verifikasi baru.',
      nilaiLama,
    }
  }

  // Tujuan tautan ditentukan oleh template email di dashboard Supabase,
  // yang mengarah ke /auth/konfirmasi dengan type=recovery.
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(hasil.data.email)

  if (error) {
    console.error('[mintaResetSandi] gagal, kode:', error.code)
    return {
      galat: adalahBatasLaju(error.code)
        ? PESAN_BATAS_LAJU
        : 'Gagal mengirim email. Coba lagi beberapa saat.',
      nilaiLama,
    }
  }

  return {
    info: `Tautan untuk mengatur ulang kata sandi sudah dikirim ke emailmu dan berlaku selama ${MASA_BERLAKU_TAUTAN}. Silahkan cek kotak masuk atau folder spam pada email untuk melakukan reset password.`,
    nilaiLama,
  }
}

export async function aturUlangSandi(
  _sebelumnya: StatusForm,
  formData: FormData
): Promise<StatusForm> {
  const sandi = ambil(formData, 'sandi')
  const konfirmasi = ambil(formData, 'konfirmasi')

  const hasil = skemaAturUlangSandi.safeParse({ sandi, konfirmasi })
  if (!hasil.success) {
    return { galatField: petakanGalat(hasil.error.issues) }
  }

  const supabase = await createClient()

  // Halaman ini hanya bermakna bila ada sesi dari tautan pemulihan
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect('/tautan-kedaluwarsa')

  const { error } = await supabase.auth.updateUser({
    password: hasil.data.sandi,
  })

  if (error) {
    console.error('[aturUlangSandi] gagal, kode:', error.code)

    let pesan = 'Gagal mengubah kata sandi. Coba lagi beberapa saat.'
    if (error.code === 'same_password') {
      pesan = 'Kata sandi baru harus berbeda dari kata sandi lama.'
    } else if (error.code === 'weak_password') {
      pesan = 'Kata sandi terlalu lemah. Gunakan kombinasi yang lebih panjang.'
    }
    return { galat: pesan }
  }

  // Memutus sesi di perangkat lain. Bila ada pihak lain yang sempat memegang
  // sesi lama, akses mereka berakhir begitu kata sandi diganti.
  const { error: galatKeluar } = await supabase.auth.signOut({
    scope: 'others',
  })
  if (galatKeluar) {
    console.error(
      '[aturUlangSandi] sesi lain gagal diputus, kode:',
      galatKeluar.code
    )
  }

  redirect('/')
}
