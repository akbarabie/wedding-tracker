import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import {
  ambilDetailPengeluaran,
  ambilKategoriOpsi,
} from '@/lib/pengeluaran/kueri'
import { hitungPembayaran } from '@/lib/pengeluaran/hitung'
import { formatRupiah, formatTanggalPendek } from '@/lib/format'
import { hariIniWib } from '@/lib/validasi/pernikahan'
import { TombolAksi } from '@/components/tombol-aksi'
import { BadgeStatus } from '../badge-status'
import {
  hapusCicilan,
  hapusPengeluaran,
  ubahStatusCicilan,
} from '../actions'
import { AksiUbahPengeluaran, FormTambahPembayaran } from './form-detail'

export default async function HalamanDetailPengeluaran({
  params,
}: PageProps<'/pengeluaran/[id]'>) {
  const { id } = await params
  // Id yang bukan uuid langsung 404, tanpa membebani database
  if (!z.uuid().safeParse(id).success) notFound()

  const { pernikahan } = await wajibPernikahan()
  const [p, kategori] = await Promise.all([
    ambilDetailPengeluaran(pernikahan.id, id),
    ambilKategoriOpsi(pernikahan.id),
  ])
  if (!p) notFound()

  const h = hitungPembayaran(p.nominal, p.payments)
  const hariIni = hariIniWib()
  const adaDp = p.payments.some((c) => c.jenis === 'dp')
  const adaPelunasan = p.payments.some((c) => c.jenis === 'pelunasan')
  const jumlahCicilanAda = p.payments.filter((c) => c.jenis === 'cicilan').length

  return (
    <main className="space-y-8">
      <div>
        <Link href="/pengeluaran" className="text-sm text-[#9F5C4C] hover:underline">
          Kembali ke daftar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {p.deskripsi ?? p.vendors?.nama ?? 'Pengeluaran'}
        </h1>
        <p className="mt-1 text-sm text-[#6B524B]">
          {p.vendors?.nama}, {p.budget_categories?.nama},{' '}
          {formatTanggalPendek(p.tanggal)}
        </p>
        <BadgeStatus status={p.status_pembayaran} />
      </div>

      <section aria-label="Ringkasan pembayaran" className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Nominal total', formatRupiah(p.nominal)],
            ['Sudah dibayar', formatRupiah(h.dibayar)],
            ['Belum dibayar', formatRupiah(h.sisaBayar)],
            ['Belum dijadwalkan', formatRupiah(h.belumDijadwalkan)],
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
        <div
          role="progressbar"
          aria-label="Persentase sudah dibayar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={h.persenDibayar}
          className="h-2 overflow-hidden rounded-full bg-[#F1E9E5]"
        >
          <div
            className="h-full bg-[#4F8A5B]"
            style={{ width: `${h.persenDibayar}%` }}
          />
        </div>
      </section>

      <section aria-labelledby="judul-cicilan" className="space-y-3">
        <h2 id="judul-cicilan" className="text-lg font-semibold">
          Riwayat dan jadwal cicilan
        </h2>

        {p.payments.length === 0 ? (
          <p className="text-sm text-[#6B524B]">Belum ada cicilan.</p>
        ) : (
          <ul className="space-y-3">
            {p.payments.map((c) => {
              const dibayar = c.dibayar_pada !== null
              const terlambat = !dibayar && c.jatuh_tempo < hariIni
              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-[#E8DDD8] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{c.label}</p>
                      <p className="text-xs text-[#6B524B]">
                        Jatuh tempo {formatTanggalPendek(c.jatuh_tempo)}
                        {dibayar &&
                          `, dibayar ${formatTanggalPendek(c.dibayar_pada as string)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatRupiah(c.nominal)}</p>
                      <p
                        className={`text-xs font-medium ${
                          dibayar
                            ? 'text-[#2E6B3A]'
                            : terlambat
                              ? 'text-[#B42318]'
                              : 'text-[#6B524B]'
                        }`}
                      >
                        {dibayar ? 'Sudah dibayar' : terlambat ? 'Terlambat' : 'Belum dibayar'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <TombolAksi
                      aksi={ubahStatusCicilan}
                      nilai={{ id: c.id, dibayar: dibayar ? '0' : '1' }}
                      label={dibayar ? 'Batalkan pembayaran' : 'Tandai dibayar'}
                      labelProses="Memproses..."
                    />
                    <TombolAksi
                      aksi={hapusCicilan}
                      nilai={{ id: c.id }}
                      label="Hapus"
                      labelProses="Menghapus..."
                      konfirmasi={`Hapus cicilan "${c.label}"?`}
                      bahaya
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="judul-tambah-pembayaran"
        className="rounded-xl border border-[#E8DDD8] bg-white p-4"
      >
        <h2 id="judul-tambah-pembayaran" className="mb-4 text-lg font-semibold">
          Tambah pembayaran
        </h2>
        {h.belumDijadwalkan > 0 ? (
          <FormTambahPembayaran
            expenseId={p.id}
            belumDijadwalkan={h.belumDijadwalkan}
            adaDp={adaDp}
            adaPelunasan={adaPelunasan}
            jumlahCicilanAda={jumlahCicilanAda}
            hariIni={hariIni}
          />
        ) : (
          <p className="text-sm text-[#6B524B]">
            Seluruh nominal sudah terjadwal. Hapus salah satu pembayaran bila
            ingin menyusun ulang.
          </p>
        )}
      </section>

      <section
        aria-labelledby="judul-kelola"
        className="space-y-3 rounded-xl border border-[#E8DDD8] bg-white p-4"
      >
        <h2 id="judul-kelola" className="text-lg font-semibold">
          Kelola pengeluaran
        </h2>
        <AksiUbahPengeluaran
          id={p.id}
          kategoriId={p.category_id ?? ''}
          deskripsi={p.deskripsi ?? ''}
          nominal={p.nominal}
          tanggal={p.tanggal}
          kategori={kategori}
        />
        <TombolAksi
          aksi={hapusPengeluaran}
          nilai={{ id: p.id }}
          label="Hapus pengeluaran"
          labelProses="Menghapus..."
          konfirmasi="Hapus pengeluaran ini beserta seluruh cicilannya?"
          bahaya
        />
      </section>
    </main>
  )
}