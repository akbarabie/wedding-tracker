import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Tujuan setelah verifikasi berhasil, ditentukan di sini dan tidak diambil dari URL.
// Dengan begitu tidak ada parameter "next" yang bisa disalahgunakan untuk open redirect.
const TUJUAN_PER_TIPE: Partial<Record<EmailOtpType, string>> = {
  email: '/',
  recovery: '/atur-ulang-sandi',
}

// Tautan di email mengarah ke sini membawa token_hash dan type.
// Verifikasi dilakukan di server dengan verifyOtp, sehingga tautan tetap bisa
// dibuka dari perangkat atau browser lain tanpa bergantung pada cookie PKCE.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const tipe = searchParams.get('type') as EmailOtpType | null

  const tujuan = tipe ? TUJUAN_PER_TIPE[tipe] : undefined

  if (tokenHash && tipe && tujuan) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type: tipe,
      token_hash: tokenHash,
    })

    if (!error) {
      return NextResponse.redirect(new URL(tujuan, request.url))
    }
    // Hanya kode galat yang dicatat, token tidak pernah masuk log
    console.error('[konfirmasi] verifikasi gagal, kode:', error.code)
  }

  return NextResponse.redirect(new URL('/tautan-kedaluwarsa', request.url))
}
