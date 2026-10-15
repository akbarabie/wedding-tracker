import Link from 'next/link'
import { KartuAuth } from '../kartu-auth'

export const metadata = { title: 'Tautan tidak berlaku | Wedding Tracker' }

export default function HalamanTautanKedaluwarsa() {
  return (
    <KartuAuth
      judul="Tautan tidak berlaku"
      deskripsi="Tautan ini sudah dipakai, kedaluwarsa, atau tidak valid. Minta tautan baru lalu coba lagi."
    >
      <div className="space-y-3">
        <Link
          href="/lupa-sandi"
          className="block w-full rounded-lg bg-[#9F5C4C] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#8A4E40]"
        >
          Minta tautan reset kata sandi
        </Link>
        <Link
          href="/masuk"
          className="block text-center text-sm font-semibold text-[#9F5C4C] hover:underline"
        >
          Kembali ke halaman masuk
        </Link>
      </div>
    </KartuAuth>
  )
}
