import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import { formatRupiah, formatTanggal } from '@/lib/format'

export default async function HalamanUtama() {
  const { claims, pernikahan } = await wajibPernikahan()
  const nama = claims.user_metadata?.nama ?? claims.email

  return (
    <main>
      <h1 className="text-2xl font-semibold">Halo, {nama}</h1>
      <p className="mt-2 text-sm text-[#6B524B]">
        Ruang kerja: {pernikahan.nama_pasangan}
      </p>

      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="w-40 text-[#6B524B]">Hari H</dt>
          <dd>
            {pernikahan.tanggal_hari_h
              ? formatTanggal(pernikahan.tanggal_hari_h)
              : 'Belum ditentukan'}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-40 text-[#6B524B]">Budget resepsi</dt>
          <dd>{formatRupiah(pernikahan.budget_total_resepsi)}</dd>
        </div>
      </dl>

      <p className="mt-6 text-sm text-[#6B524B]">
        Dashboard lengkap akan dibangun di tahap berikutnya.
      </p>
    </main>
  )
}