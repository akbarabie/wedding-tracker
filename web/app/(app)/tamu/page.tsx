import Link from 'next/link'
import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import { ambilRingkasanTamu, ambilTamu } from '@/lib/tamu/kueri'
import { estimasiKonsumsi, ringkasTamu } from '@/lib/tamu/hitung'
import {
  DAFTAR_KATEGORI_TAMU,
  DAFTAR_STATUS_RSVP,
  LABEL_KATEGORI_TAMU,
  LABEL_STATUS_RSVP,
} from '@/lib/tamu/label'
import {
  adaFilterTamu,
  bacaFilterTamu,
  susunQuery,
} from '@/lib/validasi/filter-tamu'
import { KolomPilihan } from '@/components/kolom-pilihan'
import { BarisTamu } from './baris-tamu'
import { FormTamu } from './form-tamu'

const KELAS_TOMBOL_UTAMA =
  'rounded-lg bg-[#9F5C4C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8A4E40]'
const KELAS_TOMBOL_SEKUNDER =
  'rounded-lg border border-[#E8DDD8] bg-white px-4 py-2 text-sm font-medium text-[#3B2A26] transition hover:bg-[#FBF7F4]'

export default async function HalamanTamu(props: PageProps<'/tamu'>) {
  const { pernikahan } = await wajibPernikahan()
  const filter = bacaFilterTamu(await props.searchParams)
  const filterAktif = adaFilterTamu(filter)

  // Daftar (terfilter) dan ringkasan (seluruh tamu) tidak saling bergantung
  const [daftar, barisRingkasan] = await Promise.all([
    ambilTamu(pernikahan.id, filter),
    ambilRingkasanTamu(pernikahan.id),
  ])

  const ringkasan = ringkasTamu(barisRingkasan)
  const estimasi = estimasiKonsumsi(ringkasan)
  const query = susunQuery(filter)

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Daftar tamu dan RSVP</h1>
        <p className="mt-1 text-sm text-[#6B524B]">
          Satu baris mewakili satu undangan, dan jumlah orang menunjukkan berapa orang
          yang diundang lewat undangan itu.
        </p>
      </div>

      <section aria-labelledby="judul-ringkasan" className="space-y-3">
        <h2 id="judul-ringkasan" className="sr-only">
          Ringkasan kehadiran
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DAFTAR_STATUS_RSVP.map((s) => (
            <div
              key={s}
              className="rounded-xl border border-[#E8DDD8] bg-white p-3"
            >
              <p className="text-xs text-[#6B524B]">{LABEL_STATUS_RSVP[s]}</p>
              <p className="text-2xl font-semibold">{ringkasan.perStatus[s].orang}</p>
              <p className="text-xs text-[#6B524B]">
                orang, {ringkasan.perStatus[s].undangan} undangan
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm text-[#6B524B]">
          Total {ringkasan.undangan} undangan untuk {ringkasan.orang} orang
          {DAFTAR_KATEGORI_TAMU.map(
            (k) =>
              ringkasan.perKategori[k].undangan > 0 &&
              `, ${LABEL_KATEGORI_TAMU[k].toLowerCase()} ${ringkasan.perKategori[k].orang}`
          )
            .filter(Boolean)
            .join('')}
          .
        </p>

        <div className="rounded-xl border border-[#E8DDD8] bg-white p-4">
          <h3 className="text-sm font-semibold">Estimasi konsumsi</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-[#6B524B]">Pasti hadir</dt>
              <dd className="text-xl font-semibold">{estimasi.pasti} orang</dd>
            </div>
            <div>
              <dt className="text-xs text-[#6B524B]">Perkiraan</dt>
              <dd className="text-xl font-semibold text-[#9F5C4C]">
                {estimasi.perkiraan === null ? 'Belum bisa' : `${estimasi.perkiraan} orang`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#6B524B]">Batas atas</dt>
              <dd className="text-xl font-semibold">{estimasi.maksimum} orang</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-[#6B524B]">
            {estimasi.rasioKehadiran === null
              ? 'Perkiraan muncul setelah ada tamu yang menjawab hadir atau tidak hadir. Batas atas menganggap semua yang masih ragu atau belum menjawab akan datang.'
              : `Perkiraan memakai pola tamu yang sudah menjawab, ${Math.round(estimasi.rasioKehadiran * 100)} persen dari mereka hadir, diterapkan ke yang masih ragu atau belum menjawab. Yang cepat menjawab cenderung lebih antusias, jadi baca ini sebagai perkiraan dan sesuaikan dengan kebijakan vendor catering.`}
          </p>
        </div>
      </section>

      <section
        aria-labelledby="judul-tambah-tamu"
        className="rounded-xl border border-[#E8DDD8] bg-white p-4 sm:p-6"
      >
        <h2 id="judul-tambah-tamu" className="mb-4 text-lg font-semibold">
          Tambah tamu
        </h2>
        <FormTamu />
      </section>

      {/* key memaksa form dibuat ulang saat filter berubah, karena isiannya tidak terkontrol */}
      <form
        key={query}
        method="get"
        action="/tamu"
        aria-label="Filter tamu"
        className="grid gap-3 rounded-xl border border-[#E8DDD8] bg-white p-4 sm:grid-cols-2"
      >
        <KolomPilihan id="kategori" label="Kategori" defaultValue={filter.kategori ?? ''}>
          <option value="">Semua kategori</option>
          {DAFTAR_KATEGORI_TAMU.map((k) => (
            <option key={k} value={k}>
              {LABEL_KATEGORI_TAMU[k]}
            </option>
          ))}
        </KolomPilihan>
        <KolomPilihan id="status" label="Status kehadiran" defaultValue={filter.status ?? ''}>
          <option value="">Semua status</option>
          {DAFTAR_STATUS_RSVP.map((s) => (
            <option key={s} value={s}>
              {LABEL_STATUS_RSVP[s]}
            </option>
          ))}
        </KolomPilihan>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" className={KELAS_TOMBOL_UTAMA}>
            Terapkan filter
          </button>
          {filterAktif && (
            <Link href="/tamu" className={KELAS_TOMBOL_SEKUNDER}>
              Hapus filter
            </Link>
          )}
        </div>
      </form>

      {daftar.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E8DDD8] p-6 text-center text-sm text-[#6B524B]">
          {filterAktif
            ? 'Tidak ada tamu yang cocok dengan filter ini.'
            : 'Belum ada tamu. Mulai dengan mengisi form Tambah tamu di atas.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {daftar.map((t) => (
            <BarisTamu
              key={t.id}
              tamu={{
                id: t.id,
                nama: t.nama,
                kategori: t.kategori,
                kontak: t.kontak,
                statusRsvp: t.status_rsvp,
                jumlahOrang: t.jumlah_orang,
              }}
            />
          ))}
        </ul>
      )}
    </main>
  )
}
