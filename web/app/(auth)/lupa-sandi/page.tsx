import Link from 'next/link'
import { FormLupaSandi } from '../form-sandi'
import { KartuAuth } from '../kartu-auth'

export const metadata = { title: 'Lupa kata sandi | Wedding Tracker' }

export default function HalamanLupaSandi() {
  return (
    <KartuAuth
      judul="Lupa kata sandi?"
      deskripsi="Masukkan email akunmu. Kami kirim tautan untuk mengatur ulang kata sandi."
    >
      <FormLupaSandi />

      <p className="mt-6 text-center text-sm text-[#6B524B]">
        Ingat kata sandimu?{' '}
        <Link
          href="/masuk"
          className="font-semibold text-[#9F5C4C] hover:underline"
        >
          Masuk
        </Link>
      </p>
    </KartuAuth>
  )
}
