import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  ambilPernikahanAktif,
  ambilUndanganTertunda,
} from '@/lib/pernikahan/kueri'
import { hariIniWib } from '@/lib/validasi/pernikahan'
import { keluar } from '../actions'
import { FormBuatPernikahan, FormTerimaUndangan } from './form-mulai'

export const metadata = { title: 'Mulai | Wedding Tracker' }

const KELAS_KARTU =
  'rounded-2xl border border-white/20 bg-white/10 p-7 shadow-[0_24px_60px_-24px_rgba(159,92,76,0.4)] backdrop-blur-xl sm:p-8'

export default async function HalamanMulai() {
  const supabase = await createClient()

  // getClaims memverifikasi tanda tangan token, bukan sekadar membaca cookie
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect('/masuk')

  // Pengguna yang sudah punya pernikahan tidak perlu berada di halaman ini
  if (await ambilPernikahanAktif()) redirect('/')

  const email = data.claims.email?.toLowerCase()
  const undangan = email ? await ambilUndanganTertunda(email) : []
  const undanganTerbaru = undangan[0]

  return (
    <div className="space-y-6">
      {undanganTerbaru && (
        <div className={KELAS_KARTU}>
          <h2 className="text-xl font-semibold tracking-tight">
            Kamu punya undangan
          </h2>
          <p className="mt-1 mb-6 text-sm text-[#6B524B]">
            Pasanganmu mengundang kamu ke ruang kerja pernikahan bersama. Terima
            undangan ini untuk langsung berbagi akses penuh.
          </p>
          <FormTerimaUndangan undanganId={undanganTerbaru.id} />
        </div>
      )}

      <div className={KELAS_KARTU}>
        <h2 className="text-xl font-semibold tracking-tight">
          {undanganTerbaru ? 'Atau buat pernikahan baru' : 'Buat pernikahan pertamamu'}
        </h2>
        <p className="mt-1 mb-6 text-sm text-[#6B524B]">
          Cukup tiga isian, dan dua di antaranya boleh dikosongkan dulu.
        </p>
        <FormBuatPernikahan hariIni={hariIniWib()} />
      </div>

      {/* Jalan keluar bila pengguna masuk dengan akun yang salah */}
      <form action={keluar} className="text-center">
        <button
          type="submit"
          className="text-sm text-[#6B524B] underline-offset-2 hover:underline"
        >
          Keluar dari akun ini
        </button>
      </form>
    </div>
  )
}
