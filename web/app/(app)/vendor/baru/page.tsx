import Link from 'next/link'
import { z } from 'zod'
import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import { ambilKategoriOpsi } from '@/lib/pengeluaran/kueri'
import { ambilNilai } from '@/lib/validasi/param-url'
import { FormVendor } from '../form-vendor'

export default async function HalamanVendorBaru(
  props: PageProps<'/vendor/baru'>
) {
  const { pernikahan } = await wajibPernikahan()
  const kategori = await ambilKategoriOpsi(pernikahan.id)

  // Kategori dari daftar yang sedang difilter, dipakai hanya bila valid
  const param = ambilNilai((await props.searchParams).kategori)
  const kategoriAwal = z.uuid().safeParse(param).success ? param : undefined

  return (
    <main className="space-y-6">
      <div>
        <Link href="/vendor" className="text-sm text-[#9F5C4C] hover:underline">
          Kembali ke daftar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Tambah vendor</h1>
      </div>

      <div className="rounded-xl border border-[#E8DDD8] bg-white p-4 sm:p-6">
        <FormVendor
          kategori={kategori}
          awal={kategoriAwal ? { kategoriId: kategoriAwal } : undefined}
        />
      </div>
    </main>
  )
}
