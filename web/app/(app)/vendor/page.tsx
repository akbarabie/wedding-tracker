import Link from 'next/link'
import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import { ambilDaftarVendor } from '@/lib/vendor/kueri'
import { ambilKategoriOpsi } from '@/lib/pengeluaran/kueri'
import {
  DAFTAR_STATUS_VENDOR,
  LABEL_STATUS_VENDOR,
  ringkasHarga,
} from '@/lib/vendor/label'
import { modelDariVendor } from '@/lib/vendor/hitung'
import {
  adaFilterVendor,
  bacaFilterVendor,
  susunQuery,
} from '@/lib/validasi/filter-vendor'
import { KolomPilihan } from '@/components/kolom-pilihan'
import { BadgeStatusVendor } from './badge-status-vendor'

const KELAS_TOMBOL_UTAMA =
  'rounded-lg bg-[#9F5C4C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8A4E40]'
const KELAS_TOMBOL_SEKUNDER =
  'rounded-lg border border-[#E8DDD8] bg-white px-4 py-2 text-sm font-medium text-[#3B2A26] transition hover:bg-[#FBF7F4]'

export default async function HalamanVendor(props: PageProps<'/vendor'>) {
  const { pernikahan } = await wajibPernikahan()
  const filter = bacaFilterVendor(await props.searchParams)
  const filterAktif = adaFilterVendor(filter)

  // Daftar dan pilihan filter tidak saling bergantung, jadi dijalankan paralel
  const [daftar, kategori] = await Promise.all([
    ambilDaftarVendor(pernikahan.id, filter),
    ambilKategoriOpsi(pernikahan.id),
  ])

  const query = susunQuery(filter)
  // Tautan tambah membawa kategori yang sedang difilter supaya form langsung terisi
  const urlBaru = filter.kategori
    ? `/vendor/baru?kategori=${filter.kategori}`
    : '/vendor/baru'

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Vendor dan venue</h1>
          <p className="mt-1 text-sm text-[#6B524B]">
            Simpan kandidat, catat hasil survei, lalu bandingkan sebelum memutuskan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={
              filter.kategori
                ? `/vendor/bandingkan?kategori=${filter.kategori}`
                : '/vendor/bandingkan'
            }
            className={KELAS_TOMBOL_SEKUNDER}
          >
            Bandingkan
          </Link>
          <Link href={urlBaru} className={KELAS_TOMBOL_UTAMA}>
            Tambah vendor
          </Link>
        </div>
      </div>

      {/* key memaksa form dibuat ulang saat filter berubah, karena isiannya tidak terkontrol */}
      <form
        key={query}
        method="get"
        action="/vendor"
        aria-label="Filter vendor"
        className="grid gap-3 rounded-xl border border-[#E8DDD8] bg-white p-4 sm:grid-cols-2"
      >
        <KolomPilihan
          id="kategori"
          label="Kategori"
          defaultValue={filter.kategori ?? ''}
        >
          <option value="">Semua kategori</option>
          {kategori.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </KolomPilihan>
        <KolomPilihan
          id="status"
          label="Status"
          defaultValue={filter.status ?? ''}
        >
          <option value="">Semua status</option>
          {DAFTAR_STATUS_VENDOR.map((s) => (
            <option key={s} value={s}>
              {LABEL_STATUS_VENDOR[s]}
            </option>
          ))}
        </KolomPilihan>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" className={KELAS_TOMBOL_UTAMA}>
            Terapkan filter
          </button>
          {filterAktif && (
            <Link href="/vendor" className={KELAS_TOMBOL_SEKUNDER}>
              Hapus filter
            </Link>
          )}
        </div>
      </form>

      {daftar.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E8DDD8] p-6 text-center text-sm text-[#6B524B]">
          {filterAktif
            ? 'Tidak ada vendor yang cocok dengan filter ini.'
            : 'Belum ada vendor. Mulai dengan menekan Tambah vendor.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {daftar.map((v) => (
            <li key={v.id}>
              <Link
                href={`/vendor/${v.id}`}
                className="block rounded-xl border border-[#E8DDD8] bg-white p-4 transition hover:border-[#B8924A]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{v.nama}</p>
                    <p className="text-xs text-[#6B524B]">
                      {v.budget_categories?.nama ?? 'Tanpa kategori'}
                      {v.lokasi && `, ${v.lokasi}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {ringkasHarga(modelDariVendor(v))}
                    </p>
                    <BadgeStatusVendor status={v.status} />
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
