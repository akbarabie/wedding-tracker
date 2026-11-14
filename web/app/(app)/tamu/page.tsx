import Link from 'next/link'
import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import {
  ambilRingkasanTamu,
  ambilRingkasanUndangan,
  ambilTamu,
} from '@/lib/tamu/kueri'
import {
  estimasiKonsumsi,
  ringkasTamu,
  ringkasUndangan,
} from '@/lib/tamu/hitung'
import {
  ISTILAH_TAMU,
  keteranganPasti,
  paragrafCaraHitung,
} from '@/lib/tamu/istilah'
import {
  DAFTAR_JENIS_UNDANGAN,
  DAFTAR_KATEGORI_TAMU,
  DAFTAR_PIHAK,
  DAFTAR_STATUS_RSVP,
  LABEL_JENIS_UNDANGAN,
  LABEL_KATEGORI_TAMU,
  LABEL_PIHAK_SINGKAT,
  LABEL_STATUS_RSVP,
  type StatusRsvp,
} from '@/lib/tamu/label'
import {
  NILAI_BELUM,
  adaFilterTamu,
  bacaFilterTamu,
  susunQuery,
} from '@/lib/validasi/filter-tamu'
import { KolomPilihan } from '@/components/kolom-pilihan'
import { BarisTamu } from './baris-tamu'
import { FormTamu } from './form-tamu'

const KELAS_TOMBOL_UTAMA =
  'rounded-lg bg-[#9F5C4C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8A4E40]'
// Warna angka pada kartu status. Selaras dengan warna pilihan status di baris tamu
// (hadir hijau, tidak hadir merah, ragu kuning, belum dikonfirmasi abu hangat), supaya
// satu warna selalu berarti satu status. Angka nol diredupkan agar yang kosong tidak
// terlihat sepenting yang terisi.
const WARNA_ANGKA_STATUS: Record<StatusRsvp, string> = {
  belum_konfirmasi: 'text-[#7A6A64]',
  hadir: 'text-[#2E6B3A]',
  tidak_hadir: 'text-[#B42318]',
  ragu: 'text-[#8A6A22]',
}
const WARNA_ANGKA_KOSONG = 'text-[#A39690]'

// Kartu angka untuk estimasi tamu. Teks dirata tengah seperti kartu status.
function KartuEstimasi({
  judul,
  nilai,
  keterangan,
  sorot,
}: {
  judul: string
  nilai: string
  keterangan: string
  // Menandai angka yang direkomendasikan, dengan gaya chip yang sama seperti
  // penanda "Termurah" di halaman Bandingkan vendor
  sorot?: boolean
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-3 text-center ${
        sorot ? 'border-2 border-[#BFDCC5] bg-[#F7FBF7]' : 'border-[#E8DDD8]'
      }`}
    >
      <p className="text-xs font-medium text-[#6B524B]">{judul}</p>
      <p className="mt-1 text-2xl font-semibold">
        {nilai}
        {sorot && (
          <span className="ml-2 rounded-full bg-[#E6F3E8] px-2 py-0.5 align-middle text-xs font-medium text-[#2E6B3A]">
            Rekomendasi
          </span>
        )}
      </p>
      <p className="mt-1 text-xs text-[#6B524B]">{keterangan}</p>
    </div>
  )
}

const KELAS_TOMBOL_SEKUNDER =
  'rounded-lg border border-[#E8DDD8] bg-white px-4 py-2 text-sm font-medium text-[#3B2A26] transition hover:bg-[#FBF7F4]'

export default async function HalamanTamu(props: PageProps<'/tamu'>) {
  const { pernikahan } = await wajibPernikahan()
  const filter = bacaFilterTamu(await props.searchParams)
  const filterAktif = adaFilterTamu(filter)

  // Daftar (terfilter) dan ringkasan (seluruh tamu) tidak saling bergantung
  const [daftar, barisRingkasan, barisUndangan] = await Promise.all([
    ambilTamu(pernikahan.id, filter),
    ambilRingkasanTamu(pernikahan.id),
    ambilRingkasanUndangan(pernikahan.id),
  ])

  const ringkasan = ringkasTamu(barisRingkasan)
  const estimasi = estimasiKonsumsi(ringkasan)
  const undangan = ringkasUndangan(barisUndangan)
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
          {DAFTAR_STATUS_RSVP.map((s) => {
            const { orang, undangan: jumlahUndangan } = ringkasan.perStatus[s]
            return (
              <div
                key={s}
                className="rounded-xl border border-[#E8DDD8] bg-white p-3 text-center"
              >
                <p className="text-xs text-[#6B524B]">{LABEL_STATUS_RSVP[s]}</p>
                <p
                  className={`text-2xl font-semibold ${
                    orang === 0 ? WARNA_ANGKA_KOSONG : WARNA_ANGKA_STATUS[s]
                  }`}
                >
                  {orang}
                </p>
                <p className="text-xs text-[#6B524B]">
                  orang, {jumlahUndangan} undangan
                </p>
              </div>
            )
          })}
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

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">{ISTILAH_TAMU.judul}</h3>
            <p className="text-xs text-[#6B524B]">{ISTILAH_TAMU.kegunaan}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <KartuEstimasi
              judul={ISTILAH_TAMU.pasti.nama}
              nilai={`${estimasi.pasti} Pax`}
              keterangan={keteranganPasti(estimasi)}
            />
            <KartuEstimasi
              judul={ISTILAH_TAMU.mungkin.nama}
              nilai={
                estimasi.perkiraan === null
                  ? 'Belum bisa dihitung'
                  : `${estimasi.perkiraan} Pax`
              }
              keterangan={ISTILAH_TAMU.mungkin.keterangan}
              sorot={estimasi.perkiraan !== null}
            />
            <KartuEstimasi
              judul={ISTILAH_TAMU.maksimal.nama}
              nilai={`${estimasi.maksimum} Pax`}
              keterangan={ISTILAH_TAMU.maksimal.keterangan}
            />
          </div>
          <div className="space-y-2 rounded-xl border border-[#E8DDD8] bg-white p-4">
            <h4 className="text-sm font-semibold">{ISTILAH_TAMU.judulPenjelasan}</h4>
            {paragrafCaraHitung(estimasi).map((p) => (
              <p key={p} className="text-xs leading-relaxed text-[#6B524B]">
                {p}
              </p>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-[#E8DDD8] bg-white p-4">
            <h3 className="text-sm font-semibold">Menurut pihak</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {DAFTAR_PIHAK.map((p) => (
                <li key={p} className="flex justify-between gap-3">
                  <span>{LABEL_PIHAK_SINGKAT[p]}</span>
                  <span className="text-[#6B524B]">
                    {undangan.perPihak[p].undangan} undangan,{' '}
                    {undangan.perPihak[p].orang} orang
                  </span>
                </li>
              ))}
              {undangan.perPihak.belum.undangan > 0 && (
                <li className="flex justify-between gap-3 text-[#8C7A73]">
                  <span>Belum dirinci</span>
                  <span>
                    {undangan.perPihak.belum.undangan} undangan,{' '}
                    {undangan.perPihak.belum.orang} orang
                  </span>
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-[#E8DDD8] bg-white p-4">
            <h3 className="text-sm font-semibold">Jenis undangan</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {DAFTAR_JENIS_UNDANGAN.map((j) => (
                <li key={j} className="flex justify-between gap-3">
                  <span>{LABEL_JENIS_UNDANGAN[j]}</span>
                  <span className="text-[#6B524B]">
                    {undangan.perJenis[j].undangan} undangan
                  </span>
                </li>
              ))}
              {undangan.perJenis.belum.undangan > 0 && (
                <li className="flex justify-between gap-3 text-[#8C7A73]">
                  <span>Belum diisi</span>
                  <span>{undangan.perJenis.belum.undangan} undangan</span>
                </li>
              )}
            </ul>
            <p className="mt-2 text-xs text-[#6B524B]">
              Perlu dicetak {undangan.perluDicetak} lembar, dikirim digital{' '}
              {undangan.kirimDigital} undangan. Satu baris tamu dihitung satu undangan.
            </p>
          </div>
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
        <KolomPilihan id="pihak" label="Pihak" defaultValue={filter.pihak ?? ''}>
          <option value="">Semua pihak</option>
          {DAFTAR_PIHAK.map((p) => (
            <option key={p} value={p}>
              {LABEL_PIHAK_SINGKAT[p]}
            </option>
          ))}
          <option value={NILAI_BELUM}>Belum dirinci</option>
        </KolomPilihan>
        <KolomPilihan id="jenis" label="Jenis undangan" defaultValue={filter.jenis ?? ''}>
          <option value="">Semua jenis</option>
          {DAFTAR_JENIS_UNDANGAN.map((j) => (
            <option key={j} value={j}>
              {LABEL_JENIS_UNDANGAN[j]}
            </option>
          ))}
          <option value={NILAI_BELUM}>Belum diisi</option>
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
                subKategori: t.sub_kategori,
                pihak: t.pihak,
                jenisUndangan: t.jenis_undangan,
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
