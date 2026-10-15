import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FormAturUlangSandi } from '../form-sandi'
import { KartuAuth } from '../kartu-auth'

export const metadata = { title: 'Atur ulang kata sandi | Wedding Tracker' }

export default async function HalamanAturUlangSandi() {
  const supabase = await createClient()

  // Sesi hanya ada bila pengguna datang lewat tautan pemulihan yang valid
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect('/tautan-kedaluwarsa')

  return (
    <KartuAuth
      judul="Buat kata sandi baru"
      deskripsi="Email kamu sudah terverifikasi. Pilih kata sandi baru untuk akunmu."
    >
      <FormAturUlangSandi />
    </KartuAuth>
  )
}
