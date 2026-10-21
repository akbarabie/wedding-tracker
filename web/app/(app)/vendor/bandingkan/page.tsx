import Link from 'next/link'
import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import { ambilDaftarVendor, type Vendor } from '@/lib/vendor/kueri'
import { ambilKategoriOpsi } from '@/lib/pengeluaran/kueri'
import {
  DAFTAR_SATUAN,
  LABEL_INPUT_SATUAN,
  NAMA_SATUAN,
  ringkasBiaya,
  ringkasHarga,
} from '@/lib/vendor/label'
import {
  biayaDariVendor,
  cariRentangImpas,
  hitungBiaya,
  kalimatImpas,
  modelDariVendor,
  type HasilHitung,
} from '@/lib/vendor/hitung'
import { bacaFilterVendor, bacaSkenario } from '@/lib/validasi/filter-vendor'
import { formatRupiah } from '@/lib/format'
import { KolomAngka } from '@/components/kolom-angka'
import { KolomPilihan } from '@/components/kolom-pilihan'
import { BadgeStatusVendor } from '../badge-status-vendor'

const KELAS_TOMBOL_UTAMA =
  'rounded-lg bg-[#9F5C4C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8A4E40]'

const KELAS_SEL = 'border-t border-[#E8DDD8] px-4 py-3 align-top'
const KELAS_LABEL_BARIS = `${KELAS_SEL} whitespace-nowrap text-xs font-medium text-[#6B524B]`
const KELAS_CATATAN = 'mt-1 block text-xs text-[#6B524B]'

type Baris = {
  v: Vendor
  jumlah: number | null
  hasil: HasilHitung
}

function BarisPerbandingan({
  judul,
  data,
  isi,
}: {
  judul: string
  data: Baris[]
  isi: (b: Baris) => React.ReactNode
}) {
  return (
    <tr>
      <th scope="row" className={`${KELAS_LABEL_BARIS} text-left`}>
        {judul}
      </th>
      {data.map((b) => (
        <td key={b.v.id} className={KELAS_SEL}>
          {isi(b)}
        </td>
      ))}
    </tr>
  )
}

export default async function HalamanBandingkan(
  props: PageProps<'/vendor/bandingkan'>
) {
  const param = await props.searchParams
  const { kategori: kategoriId } = bacaFilterVendor(param)
  const skenario = bacaSkenario(param)

  const { pernikahan } = await wajibPernikahan()
  const [opsiKategori, semua] = await Promise.all([
    ambilKategoriOpsi(pernikahan.id),
    kategoriId
      ? ambilDaftarVendor(pernikahan.id, { kategori: kategoriId }, { denganBiaya: true })
      : Promise.resolve([] as Vendor[]),
  ])

  // Vendor yang sudah ditolak tidak ikut dibandingkan
  const kandidat = semua.filter((v) => v.status !== 'ditolak')

  // Setiap kandidat dihitung dengan jumlah untuk satuannya sendiri. Catering memakai
  // jumlah tamu, dokumentasi memakai durasi, dan seterusnya, jadi satu halaman ini
  // berlaku untuk kategori apa pun tanpa bergantung pada nama kategorinya.
  const data: Baris[] = kandidat.map((v) => {
    const model = modelDariVendor(v)
    const jumlah = model.satuan ? (skenario.nilai[model.satuan] ?? null) : null
    return { v, jumlah, hasil: hitungBiaya(model, biayaDariVendor(v), jumlah) }
  })

  // Kolom skenario hanya ditampilkan untuk satuan yang dipakai kandidat di kategori ini
  const satuanTerpakai = DAFTAR_SATUAN.filter((s) =>
    kandidat.some((v) => v.satuan === s)
  )

  // Penanda termurah hanya untuk kandidat yang hasilnya lengkap dan tidak melebihi
  // batas, dan hanya bermakna bila ada minimal dua yang bisa dibandingkan
  const totalLayak = data
    .filter((b) => b.hasil.status === 'ok' && b.hasil.total !== null)
    .map((b) => b.hasil.total as number)
  const termurah = totalLayak.length >= 2 ? Math.min(...totalLayak) : null

  const adaOpsional = data.some((b) => b.hasil.adaOpsional)

  // Titik impas: setiap paketan (harga tetap berbatas atau paket ditambah per satuan)
  // dibandingkan dengan setiap vendor per satuan pada satuan yang sama
  const paketan = kandidat.filter((v) => v.cara_hitung !== 'per_satuan')
  const perSatuan = kandidat.filter((v) => v.cara_hitung === 'per_satuan')
  const kalimatImpasList: string[] = []
  for (const pk of paketan) {
    for (const ps of perSatuan) {
      const hasil = cariRentangImpas(
        { nama: pk.nama, model: modelDariVendor(pk), biaya: biayaDariVendor(pk) },
        { nama: ps.nama, model: modelDariVendor(ps), biaya: biayaDariVendor(ps) }
      )
      if (hasil) kalimatImpasList.push(kalimatImpas(pk.nama, ps.nama, hasil))
    }
  }

  const namaKategori = opsiKategori.find((k) => k.id === kategoriId)?.nama

  return (
    <main className="space-y-6">
      <div>
        <Link href="/vendor" className="text-sm text-[#9F5C4C] hover:underline">
          Kembali ke daftar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Bandingkan kandidat</h1>
        <p className="mt-1 text-sm text-[#6B524B]">
          Pilih satu kategori, isi kebutuhanmu, lalu lihat total biaya nyata tiap
          kandidat.
        </p>
      </div>

      <form
        method="get"
        action="/vendor/bandingkan"
        aria-label="Pilih kategori dan kebutuhan"
        className="grid gap-3 rounded-xl border border-[#E8DDD8] bg-white p-4 sm:grid-cols-2"
      >
        <KolomPilihan
          id="kategori"
          label="Kategori"
          defaultValue={kategoriId ?? ''}
        >
          <option value="">Pilih kategori</option>
          {opsiKategori.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </KolomPilihan>

        {/* Hanya satuan yang dipakai kandidat yang meminta isian */}
        {satuanTerpakai.map((s) => (
          <KolomAngka
            key={s}
            id={s}
            label={`${LABEL_INPUT_SATUAN[s]} (opsional)`}
            maksDigit={6}
            defaultValue={skenario.nilai[s] ? String(skenario.nilai[s]) : ''}
            galat={
              skenario.tidakValid[s]
                ? 'Harus berupa angka lebih dari 0.'
                : undefined
            }
            bantuan="Isi agar total biaya dan harga per satuan bisa dihitung."
          />
        ))}

        <div className="sm:col-span-2">
          <button type="submit" className={KELAS_TOMBOL_UTAMA}>
            Tampilkan perbandingan
          </button>
        </div>
      </form>

      {!kategoriId ? (
        <p className="rounded-xl border border-dashed border-[#E8DDD8] p-6 text-center text-sm text-[#6B524B]">
          Belum ada kategori yang dipilih.
        </p>
      ) : kandidat.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E8DDD8] p-6 text-center text-sm text-[#6B524B]">
          Belum ada kandidat aktif di kategori {namaKategori ?? 'ini'}.
        </p>
      ) : (
        <>
          <section aria-labelledby="judul-tabel" className="space-y-3">
            <h2 id="judul-tabel" className="text-lg font-semibold">
              {namaKategori}, {kandidat.length} kandidat
            </h2>
            {kandidat.length < 2 && (
              <p className="text-xs text-[#6B524B]">
                Tambahkan minimal satu kandidat lagi agar ada yang bisa dibandingkan.
              </p>
            )}

            {/* Tabel lebar bergulir ke samping di dalam wadahnya, halaman tidak ikut melebar */}
            <div className="overflow-x-auto rounded-xl border border-[#E8DDD8] bg-white">
              <table className="min-w-full text-sm">
                <caption className="sr-only">
                  Perbandingan kandidat vendor kategori {namaKategori}
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs text-[#6B524B]">
                      Kandidat
                    </th>
                    {data.map(({ v }) => (
                      <th
                        key={v.id}
                        scope="col"
                        className="min-w-52 px-4 py-3 text-left font-semibold"
                      >
                        <Link
                          href={`/vendor/${v.id}`}
                          className="hover:text-[#9F5C4C] hover:underline"
                        >
                          {v.nama}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <BarisPerbandingan
                    judul="Status"
                    data={data}
                    isi={({ v }) => <BadgeStatusVendor status={v.status} />}
                  />
                  <BarisPerbandingan
                    judul="Harga"
                    data={data}
                    isi={({ v }) => ringkasHarga(modelDariVendor(v))}
                  />
                  <BarisPerbandingan
                    judul="Total biaya"
                    data={data}
                    isi={({ v, hasil }) => {
                      if (hasil.total === null) {
                        const satuan = v.satuan
                        return (
                          <span className="text-xs text-[#6B524B]">
                            {hasil.status === 'butuh_jumlah' && satuan
                              ? `Isi ${LABEL_INPUT_SATUAN[satuan].toLowerCase()}`
                              : 'Harga belum lengkap'}
                          </span>
                        )
                      }
                      return (
                        <>
                          <span className="font-semibold">
                            {formatRupiah(hasil.total)}
                          </span>
                          {termurah !== null &&
                            hasil.status === 'ok' &&
                            hasil.total === termurah && (
                              <span className="ml-2 rounded-full bg-[#E6F3E8] px-2 py-0.5 text-xs font-medium text-[#2E6B3A]">
                                Termurah
                              </span>
                            )}
                          {hasil.status === 'melebihi_maksimum' && v.satuan && (
                            <span className="mt-1 block text-xs font-medium text-[#B42318]">
                              Kebutuhan melebihi batas maksimal sebanyak{' '}
                              {hasil.kelebihan} {NAMA_SATUAN[v.satuan]}
                            </span>
                          )}
                          {hasil.peringatan.map((p) => (
                            <span key={p} className={KELAS_CATATAN}>
                              {p}
                            </span>
                          ))}
                          {hasil.rincian.length > 0 && (
                            <details className="mt-1 text-xs text-[#6B524B]">
                              <summary className="cursor-pointer">Rincian</summary>
                              <ul className="mt-1 space-y-0.5">
                                {hasil.rincian.map((r) => (
                                  <li key={r.label}>
                                    {r.label}: {formatRupiah(r.nilai)}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </>
                      )
                    }}
                  />
                  <BarisPerbandingan
                    judul="Harga efektif per satuan"
                    data={data}
                    isi={({ v, hasil }) =>
                      hasil.hargaPerSatuan !== null && v.satuan ? (
                        <>
                          <span className="font-medium">
                            {formatRupiah(hasil.hargaPerSatuan)}
                          </span>
                          <span className={KELAS_CATATAN}>
                            per {NAMA_SATUAN[v.satuan]}, total dibagi jumlahnya
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-[#6B524B]">-</span>
                      )
                    }
                  />
                  <BarisPerbandingan
                    judul="Pajak"
                    data={data}
                    isi={({ v, hasil }) =>
                      !v.pajak_termasuk && v.pajak_persen > 0 ? (
                        <>
                          <span>{v.pajak_persen}% belum termasuk</span>
                          {hasil.pajak > 0 && (
                            <span className={KELAS_CATATAN}>
                              {formatRupiah(hasil.pajak)} sudah ada di total
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-[#6B524B]">
                          Tidak ada atau sudah termasuk
                        </span>
                      )
                    }
                  />
                  <BarisPerbandingan
                    judul="Biaya lainnya"
                    data={data}
                    isi={({ v }) => {
                      const biaya = v.vendor_biaya ?? []
                      if (biaya.length === 0) return '-'
                      return (
                        <ul className="space-y-1 text-xs">
                          {biaya.map((b) => (
                            <li key={b.id}>
                              <span className={b.wajib ? 'font-medium' : ''}>
                                {b.nama}
                              </span>{' '}
                              (
                              {b.jenis === 'potongan'
                                ? b.wajib
                                  ? 'potongan'
                                  : 'potongan bersyarat'
                                : b.wajib
                                  ? 'wajib'
                                  : 'opsional'}
                              ):{' '}
                              <span className={b.nominal === null ? 'text-[#8A6A22]' : ''}>
                                {ringkasBiaya({
                                  jenis: b.jenis,
                                  nominal: b.nominal,
                                  jumlah: b.jumlah,
                                  satuanLabel: b.satuan_label,
                                })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )
                    }}
                  />
                  {adaOpsional && (
                    <BarisPerbandingan
                      judul="Bila semua yang opsional ikut dihitung"
                      data={data}
                      isi={({ hasil }) =>
                        hasil.totalDenganOpsional !== null && hasil.adaOpsional ? (
                          formatRupiah(hasil.totalDenganOpsional)
                        ) : (
                          <span className="text-xs text-[#6B524B]">-</span>
                        )
                      }
                    />
                  )}
                  <BarisPerbandingan
                    judul="Batas jumlah"
                    data={data}
                    isi={({ v }) => {
                      if (!v.satuan) return '-'
                      const s = NAMA_SATUAN[v.satuan]
                      const bagian: string[] = []
                      if (v.minimum_unit !== null) bagian.push(`minimum ${v.minimum_unit} ${s}`)
                      if (v.maksimum_unit !== null) bagian.push(`maksimal ${v.maksimum_unit} ${s}`)
                      return bagian.length > 0 ? bagian.join(', ') : 'Tanpa batas'
                    }}
                  />
                  <BarisPerbandingan
                    judul="Lokasi"
                    data={data}
                    isi={({ v }) => v.lokasi ?? '-'}
                  />
                  <BarisPerbandingan
                    judul="Kontak"
                    data={data}
                    isi={({ v }) => v.kontak ?? '-'}
                  />
                  <BarisPerbandingan
                    judul="Catatan survei"
                    data={data}
                    isi={({ v }) => (
                      <span className="whitespace-pre-line">
                        {v.catatan_survei ?? '-'}
                      </span>
                    )}
                  />
                </tbody>
              </table>
            </div>
            <p className="text-xs text-[#6B524B]">
              Total sudah memasukkan harga dasar, tambahan per satuan, biaya lainnya yang
              wajib, potongan yang pasti berlaku, dan pajak yang belum termasuk. Paket dibayar utuh, tidak dihitung
              ulang secara proporsional. Penanda termurah hanya untuk kandidat
              dengan hasil lengkap yang tidak melebihi batas maksimalnya. Vendor
              berstatus ditolak tidak ditampilkan.
            </p>
          </section>

          {kalimatImpasList.length > 0 && (
            <section
              aria-labelledby="judul-impas"
              className="space-y-3 rounded-xl border border-[#E8DDD8] bg-white p-4"
            >
              <h2 id="judul-impas" className="text-lg font-semibold">
                Titik impas paket dan harga per satuan
              </h2>
              <p className="text-xs text-[#6B524B]">
                Dihitung dari total biaya sebenarnya pada setiap jumlah, termasuk
                biaya wajib dan pajak. Cocokkan dengan kebutuhanmu.
              </p>
              <ul className="space-y-2 text-sm">
                {kalimatImpasList.slice(0, 6).map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  )
}
