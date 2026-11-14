import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import { ambilItemSeserahan } from '@/lib/seserahan/kueri'
import { ringkasSeserahan } from '@/lib/seserahan/hitung'
import {
  DAFTAR_KATEGORI_SESERAHAN,
  DAFTAR_STATUS_SESERAHAN,
  LABEL_KATEGORI_SESERAHAN,
  LABEL_STATUS_SESERAHAN,
} from '@/lib/seserahan/label'
import { formatRupiah } from '@/lib/format'
import { BarKemajuan } from '@/components/bar-kemajuan'
import { TombolTemplate } from '@/components/tombol-template'
import { isiTemplateSeserahan } from './actions'
import { BarisItemSeserahan } from './baris-item'
import { FormItemSeserahan } from './form-item'

export default async function HalamanSeserahan() {
  const { pernikahan } = await wajibPernikahan()
  const item = await ambilItemSeserahan(pernikahan.id)
  const ringkasan = ringkasSeserahan(item)

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Seserahan planner</h1>
        <p className="mt-1 text-sm text-[#6B524B]">
          Daftar seserahan per kategori beserta status belanja, vendor, tautan toko, dan
          estimasi harganya.
        </p>
      </div>

      <section
        aria-label="Ringkasan seserahan"
        className="space-y-3 rounded-xl border border-[#E8DDD8] bg-white p-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm">
            <span className="text-2xl font-semibold">{ringkasan.persenSelesai}%</span>{' '}
            <span className="text-[#6B524B]">
              ({ringkasan.perStatus.selesai} dari {ringkasan.total} item selesai)
            </span>
          </p>
          <p className="text-sm">
            Total estimasi{' '}
            <span className="font-semibold">{formatRupiah(ringkasan.estimasi)}</span>
          </p>
        </div>
        <BarKemajuan persen={ringkasan.persenSelesai} label="Progres seserahan" />
        <p className="text-xs text-[#6B524B]">
          {DAFTAR_STATUS_SESERAHAN.map(
            (s) => `${LABEL_STATUS_SESERAHAN[s]} ${ringkasan.perStatus[s]}`
          ).join(', ')}
          .
          {ringkasan.tanpaHarga > 0 &&
            ` ${ringkasan.tanpaHarga} item belum punya estimasi harga, jadi total ini belum lengkap.`}
        </p>
        {item.length > 0 && (
          <TombolTemplate
            aksi={isiTemplateSeserahan}
            label="Tambahkan item template"
            varian="sekunder"
            konfirmasi={
              'Tambahkan item seserahan template?\n\nHanya item yang namanya belum ada pada kategorinya yang ditambahkan. Item template yang sudah kamu ubah namanya akan muncul lagi dengan nama aslinya.'
            }
          />
        )}
      </section>

      <section
        aria-labelledby="judul-tambah-item"
        className="rounded-xl border border-[#E8DDD8] bg-white p-4 sm:p-6"
      >
        <h2 id="judul-tambah-item" className="mb-4 text-lg font-semibold">
          Tambah item
        </h2>
        <FormItemSeserahan />
      </section>

      {item.length === 0 && (
        <div className="space-y-3 rounded-xl border border-dashed border-[#E8DDD8] p-6 text-center">
          <p className="text-sm text-[#6B524B]">
            Belum ada item. Tambahkan sendiri lewat form di atas, atau mulai dari 32
            item umum dalam 8 kategori (perlengkapan ibadah, perhiasan, pakaian, dan
            lainnya). Isinya bisa kamu ubah atau hapus kapan saja.
          </p>
          <div className="flex justify-center">
            <TombolTemplate
              aksi={isiTemplateSeserahan}
              label="Mulai dari template"
              varian="utama"
            />
          </div>
        </div>
      )}

      {DAFTAR_KATEGORI_SESERAHAN.map((kategori, indeks) => {
        const daftar = item.filter((i) => i.kategori === kategori)
        if (daftar.length === 0) return null
        const sub = ringkasan.perKategori[kategori]

        return (
          <section
            key={kategori}
            aria-labelledby={`judul-kategori-${kategori}`}
            className="space-y-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2
                id={`judul-kategori-${kategori}`}
                className="text-lg font-semibold"
              >
                {indeks + 1}. {LABEL_KATEGORI_SESERAHAN[kategori]}
              </h2>
              <p className="text-xs text-[#6B524B]">
                {sub.selesai} dari {sub.total} selesai, total{' '}
                <span className="font-medium text-[#3B2A26]">
                  {formatRupiah(sub.estimasi)}
                </span>
                {sub.tanpaHarga > 0 && ` (${sub.tanpaHarga} belum ada harga)`}
              </p>
            </div>
            <ul className="space-y-2">
              {daftar.map((i) => (
                <BarisItemSeserahan
                  key={i.id}
                  item={{
                    id: i.id,
                    kategori: i.kategori,
                    judul: i.judul,
                    status: i.status,
                    vendor: i.vendor,
                    linkToko: i.link_toko,
                    estimasiHarga:
                      i.estimasi_harga === null ? null : Number(i.estimasi_harga),
                  }}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </main>
  )
}
