import Link from 'next/link'
import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import { ambilDaftarPengeluaran } from '@/lib/pengeluaran/kueri'
import { hitungPembayaran } from '@/lib/pengeluaran/hitung'
import { formatRupiah, formatTanggalPendek } from '@/lib/format'
import { BadgeStatus } from './badge-status'

export default async function HalamanPengeluaran() {
  const { pernikahan } = await wajibPernikahan()
  const daftar = await ambilDaftarPengeluaran(pernikahan.id)

  const totalNominal = daftar.reduce((t, p) => t + p.nominal, 0)
  const totalDibayar = daftar.reduce(
    (t, p) => t + hitungPembayaran(p.nominal, p.payments).dibayar,
    0
  )

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pengeluaran</h1>
          <p className="mt-1 text-sm text-[#6B524B]">
            Setiap pengeluaran terhubung ke satu vendor dan satu kategori.
          </p>
        </div>
        <Link
          href="/pengeluaran/baru"
          className="rounded-lg bg-[#9F5C4C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8A4E40]"
        >
          Catat pengeluaran
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Jumlah pengeluaran', String(daftar.length)],
          ['Total disepakati', formatRupiah(totalNominal)],
          ['Total dibayar', formatRupiah(totalDibayar)],
          ['Masih harus dibayar', formatRupiah(totalNominal - totalDibayar)],
        ].map(([judul, nilai]) => (
          <div
            key={judul}
            className="rounded-xl border border-[#E8DDD8] bg-white p-4"
          >
            <p className="text-xs text-[#6B524B]">{judul}</p>
            <p className="mt-1 text-lg font-semibold">{nilai}</p>
          </div>
        ))}
      </div>

      {daftar.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E8DDD8] p-6 text-center text-sm text-[#6B524B]">
          Belum ada pengeluaran. Mulai dengan menekan Catat pengeluaran.
        </p>
      ) : (
        <ul className="space-y-3">
          {daftar.map((p) => (
            <li key={p.id}>
              <Link
                href={`/pengeluaran/${p.id}`}
                className="block rounded-xl border border-[#E8DDD8] bg-white p-4 transition hover:border-[#B8924A]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {p.deskripsi ?? p.vendors?.nama ?? 'Pengeluaran'}
                    </p>
                    <p className="text-xs text-[#6B524B]">
                      {p.vendors?.nama}, {p.budget_categories?.nama},{' '}
                      {formatTanggalPendek(p.tanggal)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatRupiah(p.nominal)}</p>
                    <BadgeStatus status={p.status_pembayaran} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}