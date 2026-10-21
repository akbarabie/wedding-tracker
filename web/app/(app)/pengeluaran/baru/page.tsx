import Link from 'next/link'
import { z } from 'zod'
import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import { ambilOpsiForm } from '@/lib/pengeluaran/kueri'
import { hariIniWib } from '@/lib/validasi/pernikahan'
import { ambilNilai } from '@/lib/validasi/param-url'
import { FormPengeluaran } from './form-pengeluaran'

export default async function HalamanPengeluaranBaru(
  props: PageProps<'/pengeluaran/baru'>
) {
  const { pernikahan } = await wajibPernikahan()
  const opsi = await ambilOpsiForm(pernikahan.id)

  // Isian awal dari halaman vendor (tawaran setelah deal). Nilai yang tidak
  // valid diabaikan, dan pilihan yang tidak ada di daftar tampil sebagai kosong.
  const param = await props.searchParams
  const kategoriId = ambilNilai(param.kategori)
  const vendorId = ambilNilai(param.vendor)
  const nominal = ambilNilai(param.nominal)
  const awal = {
    kategoriId: z.uuid().safeParse(kategoriId).success ? kategoriId : undefined,
    vendorId: z.uuid().safeParse(vendorId).success ? vendorId : undefined,
    nominal: nominal && /^\d{1,12}$/.test(nominal) ? nominal : undefined,
  }

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
          awal={awal}
        />
      </div>
    </main>
  )
}