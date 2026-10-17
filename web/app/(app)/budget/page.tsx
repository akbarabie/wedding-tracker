import Link from 'next/link'
import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import {
  ambilRingkasanKategori,
  type RingkasanKategori,
} from '@/lib/budget/kueri'
import {
  hitungRingkasan,
  labelPeringatan,
  tingkatPeringatan,
  type TingkatPeringatan,
} from '@/lib/budget/hitung'
import { formatRupiah } from '@/lib/format'
import { AksiKategori, FormTambahKategori } from './form-kategori'

const WARNA_BAR: Record<TingkatPeringatan, string> = {
  aman: 'bg-[#4F8A5B]',
  dekat: 'bg-[#B8924A]',
  lewat: 'bg-[#B42318]',
  tanpa_rencana: 'bg-[#D9CFCB]',
}

const WARNA_TEKS: Record<TingkatPeringatan, string> = {
  aman: 'text-[#2E6B3A]',
  dekat: 'text-[#8A6A22]',
  lewat: 'text-[#B42318]',
  tanpa_rencana: 'text-[#6B524B]',
}

function Kartu({
  judul,
  nilai,
  merah,
}: {
  judul: string
  nilai: string
  merah?: boolean
}) {
  return (
    <div className="rounded-xl border border-[#E8DDD8] bg-white p-4">
      <p className="text-xs text-[#6B524B]">{judul}</p>
      <p
        className={`mt-1 text-lg font-semibold ${merah ? 'text-[#B42318]' : ''}`}
      >
        {nilai}
      </p>
    </div>
  )
}

function BarisKategori({ k }: { k: RingkasanKategori }) {
  const sisa = k.nilai_rencana - k.total_komitmen
  const tingkat = tingkatPeringatan(k.total_komitmen, k.nilai_rencana)
  const persen =
    k.nilai_rencana > 0
      ? Math.min(100, Math.round((k.total_komitmen / k.nilai_rencana) * 100))
      : k.total_komitmen > 0
        ? 100
        : 0

  return (
    <li className="rounded-xl border border-[#E8DDD8] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-medium">{k.nama}</h3>
          <p className="text-xs text-[#6B524B]">
            {k.jumlah_pengeluaran > 0 ? (
              <Link
                href={`/pengeluaran?kategori=${k.category_id}`}
                className="underline underline-offset-2 transition hover:text-[#9F5C4C]"
              >
                {k.jumlah_pengeluaran} pengeluaran, lihat rincian
              </Link>
            ) : (
              '0 pengeluaran'
            )}
          </p>
        </div>
        <p className="text-sm">
          {formatRupiah(k.total_komitmen)} dari {formatRupiah(k.nilai_rencana)}
        </p>
      </div>

      <div
        role="progressbar"
        aria-label={`Pemakaian budget ${k.nama}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={persen}
        className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1E9E5]"
      >
        <div
          className={`h-full ${WARNA_BAR[tingkat]}`}
          style={{ width: `${persen}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs">
        <span className={`font-medium ${WARNA_TEKS[tingkat]}`}>
          {labelPeringatan(tingkat, sisa)}
        </span>
        <span className="text-[#6B524B]">
          Sisa {formatRupiah(sisa)}, terbayar {formatRupiah(k.total_dibayar)}
        </span>
      </div>

      <AksiKategori
        id={k.category_id}
        nama={k.nama}
        nilaiRencana={k.nilai_rencana}
      />
    </li>
  )
}

export default async function HalamanBudget() {
  const { pernikahan } = await wajibPernikahan()
  const kategori = await ambilRingkasanKategori(pernikahan.id)
  const r = hitungRingkasan(kategori, pernikahan.budget_total_resepsi)

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Budget</h1>
        <p className="mt-1 text-sm text-[#6B524B]">
          Sisa budget dihitung dari total pengeluaran final yang sudah
          disepakati, bukan hanya yang sudah dibayar.
        </p>
      </div>

      <section aria-label="Ringkasan budget resepsi">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kartu judul="Budget resepsi" nilai={formatRupiah(r.budgetResepsi)} />
          <Kartu
            judul="Sudah disepakati"
            nilai={formatRupiah(r.komitmenResepsi)}
          />
          <Kartu
            judul="Sisa budget"
            nilai={formatRupiah(r.sisaResepsi)}
            merah={r.sisaResepsi < 0}
          />
          <Kartu judul="Sudah dibayar" nilai={formatRupiah(r.dibayarResepsi)} />
        </div>

        {r.alokasiMelebihi && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-[#FEF3F2] px-3.5 py-2.5 text-sm text-[#B42318]"
          >
            Jumlah rencana semua kategori ({formatRupiah(r.rencanaResepsi)})
            melebihi budget resepsi ({formatRupiah(r.budgetResepsi)}).
          </p>
        )}
      </section>

      <section aria-label="Total rencana budget" className="space-y-3">
        <h2 className="text-lg font-semibold">Total rencana yang sudah disusun</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kartu
            judul="Rencana kategori resepsi"
            nilai={formatRupiah(r.rencanaResepsi)}
          />
          {r.budgetResepsi > 0 && (
            <Kartu
              judul={
                r.sisaAlokasi >= 0
                  ? 'Belum dialokasikan'
                  : 'Alokasi melebihi budget'
              }
              nilai={formatRupiah(Math.abs(r.sisaAlokasi))}
              merah={r.sisaAlokasi < 0}
            />
          )}
          <Kartu
            judul="Rencana di luar resepsi"
            nilai={formatRupiah(r.rencanaLuar)}
          />
          <Kartu
            judul="Total seluruh rencana"
            nilai={formatRupiah(r.rencanaTotal)}
          />
        </div>
        {r.budgetResepsi <= 0 && (
          <p className="text-xs text-[#6B524B]">
            Budget total resepsi belum diisi, jadi selisih alokasi belum bisa dihitung.
          </p>
        )}
      </section>

      <section aria-labelledby="judul-resepsi" className="space-y-3">
        <h2 id="judul-resepsi" className="text-lg font-semibold">
          Kategori resepsi
        </h2>
        {r.resepsi.length === 0 ? (
          <p className="text-sm text-[#6B524B]">Belum ada kategori.</p>
        ) : (
          <ul className="space-y-3">
            {r.resepsi.map((k) => (
              <BarisKategori key={k.category_id} k={k} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="judul-luar" className="space-y-3">
        <div>
          <h2 id="judul-luar" className="text-lg font-semibold">
            Di luar budget resepsi
          </h2>
          <p className="text-xs text-[#6B524B]">
            Disepakati {formatRupiah(r.komitmenLuar)} dari rencana{' '}
            {formatRupiah(r.rencanaLuar)}, terbayar {formatRupiah(r.dibayarLuar)}
          </p>
        </div>
        {r.luar.length === 0 ? (
          <p className="text-sm text-[#6B524B]">Belum ada kategori.</p>
        ) : (
          <ul className="space-y-3">
            {r.luar.map((k) => (
              <BarisKategori key={k.category_id} k={k} />
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="judul-tambah"
        className="rounded-xl border border-[#E8DDD8] bg-white p-4"
      >
        <h2 id="judul-tambah" className="mb-4 text-lg font-semibold">
          Tambah kategori
        </h2>
        <FormTambahKategori />
      </section>
    </main>
  )
}