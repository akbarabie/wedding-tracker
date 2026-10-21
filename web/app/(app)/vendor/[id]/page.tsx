import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import {
  ambilDetailVendor,
  ambilRingkasanPengeluaranVendor,
} from '@/lib/vendor/kueri'
import { ambilKategoriOpsi } from '@/lib/pengeluaran/kueri'
import { LABEL_CARA_HITUNG, ringkasBiaya, ringkasHarga } from '@/lib/vendor/label'
import {
  biayaDariVendor,
  hitungBiaya,
  modelDariVendor,
} from '@/lib/vendor/hitung'
import { formatRupiah } from '@/lib/format'
import { TombolAksi } from '@/components/tombol-aksi'
import { BadgeStatusVendor } from '../badge-status-vendor'
import { FormVendor } from '../form-vendor'
import { FormBiaya } from '../form-biaya'
import { hapusBiaya, hapusVendor } from '../actions'

export default async function HalamanDetailVendor({
  params,
}: PageProps<'/vendor/[id]'>) {
  const { id } = await params
  // Id yang bukan uuid langsung 404, tanpa membebani database
  if (!z.uuid().safeParse(id).success) notFound()

  const { pernikahan } = await wajibPernikahan()
  const [v, kategori, ringkasan] = await Promise.all([
    ambilDetailVendor(pernikahan.id, id),
    ambilKategoriOpsi(pernikahan.id),
    ambilRingkasanPengeluaranVendor(pernikahan.id, id),
  ])
  if (!v) notFound()

  const model = modelDariVendor(v)
  const biaya = v.vendor_biaya ?? []
  const jumlahPengeluaran = ringkasan.jumlah
  const adaDibayar = ringkasan.jumlahPembayaranDibayar > 0

  // Aturan yang sama ditegakkan di database. Di sini hanya dipakai untuk memilih
  // tampilan yang jujur kepada pengguna: tombol yang pasti ditolak tidak ditampilkan.
  const hapusLangsung = jumlahPengeluaran === 0
  const hapusBersamaPengeluaran =
    jumlahPengeluaran > 0 && !adaDibayar && v.status === 'ditolak'

  const catatanStatus = adaDibayar
    ? 'Status dikunci sebagai deal karena sudah ada pembayaran yang tercatat dibayar. Batalkan tanda dibayar atau hapus pengeluarannya bila ingin mengubah status.'
    : jumlahPengeluaran > 0
      ? `Vendor ini punya ${jumlahPengeluaran} pengeluaran yang belum ada pembayarannya. Status masih bisa diubah, tetapi pengeluarannya tetap tercatat dan tetap dihitung di budget sampai pengeluaran atau vendornya dihapus.`
      : undefined

  // Tawaran mencatat pengeluaran muncul selama vendor sudah deal tetapi belum
  // punya pengeluaran. Dibuat sebagai tautan berisi isian awal, bukan pembuatan
  // otomatis, supaya nominal akhir tetap diperiksa pengguna dan tidak ada data ganda.
  const tawarkanPengeluaran = v.status === 'deal' && jumlahPengeluaran === 0
  const paramPengeluaran = new URLSearchParams({ vendor: v.id })
  if (v.category_id) paramPengeluaran.set('kategori', v.category_id)
  // Nominal hanya bisa diisi otomatis untuk harga tetap, karena jenis lain butuh
  // jumlah yang belum pasti. Total sudah termasuk biaya wajib dan pajak.
  const totalTetap = hitungBiaya(model, biayaDariVendor(v), null)
  if (totalTetap.status === 'ok' && totalTetap.total !== null && totalTetap.total > 0) {
    paramPengeluaran.set('nominal', String(Math.round(totalTetap.total)))
  }

  return (
    <main className="space-y-8">
      <div>
        <Link href="/vendor" className="text-sm text-[#9F5C4C] hover:underline">
          Kembali ke daftar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{v.nama}</h1>
        <p className="mt-1 text-sm text-[#6B524B]">
          {v.budget_categories?.nama ?? 'Tanpa kategori'}
          {v.lokasi && `, ${v.lokasi}`}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <BadgeStatusVendor status={v.status} />
          <span className="text-sm font-medium">{ringkasHarga(model)}</span>
        </div>
        <p className="mt-1 text-xs text-[#6B524B]">
          {LABEL_CARA_HITUNG[v.cara_hitung]}
        </p>
      </div>

      {v.status === 'ditolak' && jumlahPengeluaran > 0 && (
        <section
          aria-label="Peringatan vendor ditolak"
          role="alert"
          className="rounded-xl bg-[#FEF3F2] p-4 text-sm text-[#B42318]"
        >
          Vendor ini berstatus ditolak tetapi masih punya {jumlahPengeluaran}{' '}
          pengeluaran senilai {formatRupiah(ringkasan.totalNominal)} yang masih
          dihitung di budget. Hapus vendor ini untuk ikut menghapus
          pengeluarannya, atau kembalikan statusnya bila masih dipakai.
        </section>
      )}

      {tawarkanPengeluaran && (
        <section
          aria-label="Tawaran mencatat pengeluaran"
          className="rounded-xl border border-[#B8924A] bg-[#FBF1DC] p-4"
        >
          <p className="text-sm font-medium">
            Vendor ini sudah deal tetapi belum punya pengeluaran.
          </p>
          <p className="mt-1 text-xs text-[#6B524B]">
            Catat sekarang supaya budget dan jadwal pembayarannya ikut terhitung.
            Kategori, vendor, dan nominal (untuk harga tetap) terisi otomatis.
          </p>
          <Link
            href={`/pengeluaran/baru?${paramPengeluaran.toString()}`}
            className="mt-3 inline-block rounded-lg bg-[#9F5C4C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8A4E40]"
          >
            Catat pengeluaran
          </Link>
        </section>
      )}

      {jumlahPengeluaran > 0 && (
        <p className="text-sm">
          <Link
            href={`/pengeluaran?vendor=${v.id}`}
            className="text-[#9F5C4C] underline underline-offset-2"
          >
            Lihat {jumlahPengeluaran} pengeluaran vendor ini
          </Link>
        </p>
      )}

      {(v.kontak || v.catatan_survei) && (
        <section aria-label="Kontak dan catatan survei" className="space-y-3">
          {v.kontak && (
            <div className="rounded-xl border border-[#E8DDD8] bg-white p-4">
              <p className="text-xs text-[#6B524B]">Kontak</p>
              <p className="mt-1 text-sm">{v.kontak}</p>
            </div>
          )}
          {v.catatan_survei && (
            <div className="rounded-xl border border-[#E8DDD8] bg-white p-4">
              <p className="text-xs text-[#6B524B]">Catatan hasil survei</p>
              <p className="mt-1 whitespace-pre-line text-sm">
                {v.catatan_survei}
              </p>
            </div>
          )}
        </section>
      )}

      <section
        aria-labelledby="judul-biaya"
        className="space-y-4 rounded-xl border border-[#E8DDD8] bg-white p-4 sm:p-6"
      >
        <div>
          <h2 id="judul-biaya" className="text-lg font-semibold">
            Biaya lainnya
          </h2>
          <p className="mt-1 text-xs text-[#6B524B]">
            Biaya di luar harga pokok dan pajak, misalnya listrik, keamanan, air,
            sound system, atau charge luar kota. Bisa juga potongan atau
            cashback. Yang wajib selalu dihitung di perbandingan, yang opsional
            hanya ditampilkan.
          </p>
        </div>

        {biaya.length === 0 ? (
          <p className="text-sm text-[#6B524B]">Belum ada biaya lainnya.</p>
        ) : (
          <ul className="space-y-2">
            {biaya.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E8DDD8] px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {b.nama}{' '}
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.jenis === 'potongan'
                          ? 'bg-[#E6F3E8] text-[#2E6B3A]'
                          : b.wajib
                            ? 'bg-[#FBF1DC] text-[#8A6A22]'
                            : 'bg-[#F1E9E5] text-[#6B524B]'
                      }`}
                    >
                      {b.jenis === 'potongan'
                        ? b.wajib
                          ? 'Potongan'
                          : 'Potongan bersyarat'
                        : b.wajib
                          ? 'Wajib'
                          : 'Opsional'}
                    </span>
                  </p>
                  <p
                    className={`text-xs ${b.nominal === null ? 'text-[#8A6A22]' : 'text-[#6B524B]'}`}
                  >
                    {ringkasBiaya({
                      jenis: b.jenis,
                      nominal: b.nominal,
                      jumlah: b.jumlah,
                      satuanLabel: b.satuan_label,
                    })}
                  </p>
                </div>
                <TombolAksi
                  aksi={hapusBiaya}
                  nilai={{ id: b.id }}
                  label="Hapus"
                  labelProses="Menghapus..."
                  konfirmasi={`Hapus ${b.jenis === 'potongan' ? 'potongan' : 'biaya'} "${b.nama}"?\n\nTindakan ini tidak bisa dibatalkan.`}
                  bahaya
                />
              </li>
            ))}
          </ul>
        )}

        {biaya.length < 30 ? (
          <FormBiaya vendorId={v.id} jumlahBiaya={biaya.length} />
        ) : (
          <p className="text-xs text-[#6B524B]">
            Batas 30 biaya lainnya per vendor sudah tercapai.
          </p>
        )}
      </section>

      <section
        aria-labelledby="judul-ubah"
        className="rounded-xl border border-[#E8DDD8] bg-white p-4 sm:p-6"
      >
        <h2 id="judul-ubah" className="mb-4 text-lg font-semibold">
          Ubah data vendor
        </h2>
        <FormVendor
          id={v.id}
          kategori={kategori}
          kunciDeal={adaDibayar}
          catatanStatus={catatanStatus}
          awal={{
            nama: v.nama,
            kategoriId: v.category_id ?? '',
            lokasi: v.lokasi ?? '',
            caraHitung: v.cara_hitung,
            satuan: v.satuan ?? '',
            hargaDasar: v.harga_dasar === null ? '' : String(Math.round(v.harga_dasar)),
            jumlahTermasuk: v.jumlah_termasuk === null ? '' : String(v.jumlah_termasuk),
            tarifPerSatuan:
              v.tarif_per_satuan === null ? '' : String(Math.round(v.tarif_per_satuan)),
            minimumUnit: v.minimum_unit === null ? '' : String(v.minimum_unit),
            maksimumUnit: v.maksimum_unit === null ? '' : String(v.maksimum_unit),
            pajak: v.pajak_termasuk ? 'termasuk' : 'belum',
            pajakPersen: v.pajak_persen > 0 ? String(v.pajak_persen) : '',
            kontak: v.kontak ?? '',
            catatanSurvei: v.catatan_survei ?? '',
            status: v.status,
          }}
        />
      </section>

      <section
        aria-labelledby="judul-hapus"
        className="space-y-3 rounded-xl border border-[#E8DDD8] bg-white p-4"
      >
        <h2 id="judul-hapus" className="text-lg font-semibold">
          Hapus vendor
        </h2>

        {hapusLangsung && (
          <>
            <p className="text-xs text-[#6B524B]">
              Vendor ini belum punya pengeluaran. Menghapusnya akan menghilangkan
              seluruh datanya (harga, biaya lainnya, kontak, catatan survei)
              secara permanen.
            </p>
            <TombolAksi
              aksi={hapusVendor}
              nilai={{ id: v.id }}
              label="Hapus vendor"
              labelProses="Menghapus..."
              konfirmasi={`Hapus vendor "${v.nama}"?\n\nSeluruh datanya (harga, ${biaya.length} biaya lainnya, kontak, catatan survei) akan hilang. Tindakan ini tidak bisa dibatalkan.`}
              bahaya
            />
          </>
        )}

        {hapusBersamaPengeluaran && (
          <>
            <p className="text-sm text-[#B42318]">
              Perhatian: vendor ini punya {jumlahPengeluaran} pengeluaran senilai{' '}
              {formatRupiah(ringkasan.totalNominal)}. Menghapus vendor akan ikut
              menghapus pengeluaran tersebut beserta jadwal pembayarannya secara
              permanen, lalu budget dihitung ulang.
            </p>
            <p className="text-xs text-[#6B524B]">
              Hal ini dibolehkan karena vendor berstatus ditolak dan belum ada
              pembayaran yang tercatat dibayar.{' '}
              <Link
                href={`/pengeluaran?vendor=${v.id}`}
                className="underline underline-offset-2"
              >
                Periksa pengeluarannya dulu
              </Link>
              .
            </p>
            <TombolAksi
              aksi={hapusVendor}
              nilai={{ id: v.id }}
              label="Hapus vendor dan pengeluarannya"
              labelProses="Menghapus..."
              konfirmasi={`Hapus vendor "${v.nama}" beserta ${jumlahPengeluaran} pengeluarannya (total ${formatRupiah(ringkasan.totalNominal)}) dan seluruh jadwal pembayarannya?\n\nSemua data ini akan hilang permanen dan budget dihitung ulang. Tindakan ini tidak bisa dibatalkan.`}
              bahaya
            />
          </>
        )}

        {!hapusLangsung && !hapusBersamaPengeluaran && (
          <>
            <p className="text-sm">
              {adaDibayar
                ? 'Vendor ini punya pembayaran yang sudah tercatat dibayar. Hapus pengeluarannya terlebih dahulu, baru vendor bisa dihapus.'
                : `Vendor ini masih punya ${jumlahPengeluaran} pengeluaran. Hapus pengeluarannya terlebih dahulu, baru vendor bisa dihapus.`}
            </p>
            <Link
              href={`/pengeluaran?vendor=${v.id}`}
              className="inline-block text-sm text-[#9F5C4C] underline underline-offset-2"
            >
              Lihat pengeluaran vendor ini
            </Link>
          </>
        )}
      </section>
    </main>
  )
}
