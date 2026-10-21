import Link from 'next/link'
import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import { ambilDaftarPengeluaran, ambilOpsiForm } from '@/lib/pengeluaran/kueri'
import { hitungPembayaran } from '@/lib/pengeluaran/hitung'
import {
  adaFilter,
  bacaFilter,
  susunQuery,
} from '@/lib/validasi/filter-pengeluaran'
import { formatRupiah, formatTanggalPendek } from '@/lib/format'
import { Kolom } from '@/components/kolom'
import { KolomPilihan } from '@/components/kolom-pilihan'
import { BadgeStatus } from './badge-status'

const KELAS_TOMBOL_UTAMA =
  'rounded-lg bg-[#9F5C4C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8A4E40]'
const KELAS_TOMBOL_SEKUNDER =
  'rounded-lg border border-[#E8DDD8] bg-white px-4 py-2 text-sm font-medium text-[#3B2A26] transition hover:bg-[#FBF7F4]'

export default async function HalamanPengeluaran(
  props: PageProps<'/pengeluaran'>
) {
  const { pernikahan } = await wajibPernikahan()
  const filter = bacaFilter(await props.searchParams)
  const filterAktif = adaFilter(filter)

  // Daftar dan pilihan filter tidak saling bergantung, jadi dijalankan paralel
  const [daftar, opsi] = await Promise.all([
    ambilDaftarPengeluaran(pernikahan.id, filter),
    ambilOpsiForm(pernikahan.id),
  ])

  const totalNominal = daftar.reduce((t, p) => t + p.nominal, 0)
  const totalDibayar = daftar.reduce(
    (t, p) => t + hitungPembayaran(p.nominal, p.payments).dibayar,
    0
  )

  // Tautan unduh dibuat dari filter yang sudah tervalidasi, bukan dari URL mentah
  const query = susunQuery(filter)
  const urlCsv = query ? `/api/expenses?${query}` : '/api/expenses'

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pengeluaran</h1>
          <p className="mt-1 text-sm text-[#6B524B]">
            Setiap pengeluaran terhubung ke satu vendor dan satu kategori.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Memakai a biasa, bukan Link, supaya Next tidak memuat awal rute unduhan */}
          <a href={urlCsv} className={KELAS_TOMBOL_SEKUNDER}>
            Unduh CSV
          </a>
          <Link href="/pengeluaran/baru" className={KELAS_TOMBOL_UTAMA}>
            Catat pengeluaran
          </Link>
        </div>
      </div>

      {/* key memaksa form dibuat ulang saat filter berubah, karena isiannya tidak terkontrol */}
      <form
        key={query}
        method="get"
        action="/pengeluaran"
        aria-label="Filter pengeluaran"
        className="grid gap-3 rounded-xl border border-[#E8DDD8] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KolomPilihan
          id="kategori"
          label="Kategori"
          defaultValue={filter.kategori ?? ''}
        >
          <option value="">Semua kategori</option>
          {opsi.kategori.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </KolomPilihan>
        <KolomPilihan
          id="vendor"
          label="Vendor"
          defaultValue={filter.vendor ?? ''}
        >
          <option value="">Semua vendor</option>
          {opsi.vendor.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nama}
            </option>
          ))}
        </KolomPilihan>
        <Kolom
          id="dari"
          label="Dari tanggal"
          type="date"
          defaultValue={filter.dari}
        />
        <Kolom
          id="sampai"
          label="Sampai tanggal"
          type="date"
          defaultValue={filter.sampai}
        />
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className={KELAS_TOMBOL_UTAMA}>
            Terapkan filter
          </button>
          {filterAktif && (
            <Link href="/pengeluaran" className={KELAS_TOMBOL_SEKUNDER}>
              Hapus filter
            </Link>
          )}
        </div>
      </form>

      {filterAktif && (
        <p className="text-sm text-[#6B524B]" role="status">
          Menampilkan {daftar.length} pengeluaran sesuai filter. Angka ringkasan
          dan berkas CSV mengikuti filter yang sama.
        </p>
      )}

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
          {filterAktif
            ? 'Tidak ada pengeluaran yang cocok dengan filter ini.'
            : 'Belum ada pengeluaran. Mulai dengan menekan Catat pengeluaran.'}
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
