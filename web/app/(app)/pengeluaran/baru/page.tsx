import Link from 'next/link'
import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import { ambilOpsiForm } from '@/lib/pengeluaran/kueri'
import { hariIniWib } from '@/lib/validasi/pernikahan'
import { FormPengeluaran } from './form-pengeluaran'

export default async function HalamanPengeluaranBaru() {
  const { pernikahan } = await wajibPernikahan()
  const opsi = await ambilOpsiForm(pernikahan.id)

  return (
    <main className="space-y-6">
      <div>
        <Link href="/pengeluaran" className="text-sm text-[#9F5C4C] hover:underline">
          Kembali ke daftar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Catat pengeluaran</h1>
      </div>

      <div className="rounded-xl border border-[#E8DDD8] bg-white p-4 sm:p-6">
        <FormPengeluaran
          kategori={opsi.kategori}
          vendor={opsi.vendor}
          hariIni={hariIniWib()}
        />
      </div>
    </main>
  )
}