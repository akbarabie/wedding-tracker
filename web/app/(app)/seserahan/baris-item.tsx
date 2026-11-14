'use client'

import { useState, useTransition, type ChangeEvent } from 'react'
import { TombolAksi } from '@/components/tombol-aksi'
import { formatRupiah } from '@/lib/format'
import {
  DAFTAR_STATUS_SESERAHAN,
  LABEL_STATUS_SESERAHAN,
  type KategoriSeserahan,
  type StatusSeserahan,
} from '@/lib/seserahan/label'
import { hapusItemSeserahan, ubahStatusSeserahan } from './actions'
import { FormItemSeserahan } from './form-item'

const KELAS_TOMBOL_TEPI =
  'rounded-lg border border-[#E8DDD8] px-3 py-1.5 text-sm text-[#3B2A26] transition hover:bg-[#FBF7F4] disabled:opacity-60'

// Warna pilihan status supaya daftar mudah dipindai sekilas
const WARNA_STATUS: Record<StatusSeserahan, string> = {
  perlu_dibeli: 'border-[#F3C9C4] bg-[#FEF3F2] text-[#B42318]',
  dipesan: 'border-[#EBD9A8] bg-[#FBF1DC] text-[#8A6A22]',
  selesai: 'border-[#BFDCC5] bg-[#E6F3E8] text-[#2E6B3A]',
}

export type DataItem = {
  id: string
  kategori: KategoriSeserahan
  judul: string
  status: StatusSeserahan
  vendor: string | null
  linkToko: string | null
  estimasiHarga: number | null
}

// Pilihan status yang langsung tersimpan saat diganti. Tampilan berubah dulu supaya terasa
// cepat, dan dikembalikan bila penyimpanan gagal. Induknya memberi key yang memuat status
// dari server, jadi komponen ini dibuat ulang saat data server berubah.
function PilihStatus({ id, nilai }: { id: string; nilai: StatusSeserahan }) {
  const [pilihan, setPilihan] = useState<StatusSeserahan>(nilai)
  const [galat, setGalat] = useState<string | null>(null)
  const [sedangProses, mulai] = useTransition()

  function saatUbah(e: ChangeEvent<HTMLSelectElement>) {
    const baru = e.target.value as StatusSeserahan
    const lama = pilihan
    setPilihan(baru)
    setGalat(null)

    mulai(async () => {
      const data = new FormData()
      data.set('id', id)
      data.set('status', baru)
      const hasil = await ubahStatusSeserahan({}, data)
      if (hasil.galat) {
        setPilihan(lama)
        setGalat(hasil.galat)
      }
    })
  }

  return (
    <div>
      <select
        aria-label="Status item"
        value={pilihan}
        onChange={saatUbah}
        disabled={sedangProses}
        className={`rounded-lg border px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#B8924A]/40 disabled:opacity-60 ${WARNA_STATUS[pilihan]}`}
      >
        {DAFTAR_STATUS_SESERAHAN.map((s) => (
          <option key={s} value={s}>
            {LABEL_STATUS_SESERAHAN[s]}
          </option>
        ))}
      </select>
      {galat && (
        <p role="alert" className="mt-1 text-xs text-[#B42318]">
          {galat}
        </p>
      )}
    </div>
  )
}

export function BarisItemSeserahan({ item }: { item: DataItem }) {
  const [sedangUbah, setSedangUbah] = useState(false)

  return (
    <li className="rounded-xl border border-[#E8DDD8] bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={
              item.status === 'selesai'
                ? 'font-medium text-[#8C7A73] line-through'
                : 'font-medium'
            }
          >
            {item.judul}
          </p>
          <p className="text-xs text-[#6B524B]">
            {item.vendor ? `${item.vendor}, ` : ''}
            {item.estimasiHarga === null
              ? 'Estimasi harga belum diisi'
              : formatRupiah(item.estimasiHarga)}
            {item.linkToko && (
              <>
                {', '}
                <a
                  href={item.linkToko}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-[#9F5C4C] underline"
                >
                  Buka toko
                </a>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <PilihStatus key={`${item.id}-${item.status}`} id={item.id} nilai={item.status} />
          <button
            type="button"
            onClick={() => setSedangUbah((v) => !v)}
            aria-expanded={sedangUbah}
            className={KELAS_TOMBOL_TEPI}
          >
            {sedangUbah ? 'Batal' : 'Ubah'}
          </button>
          <TombolAksi
            aksi={hapusItemSeserahan}
            nilai={{ id: item.id }}
            label="Hapus"
            labelProses="Menghapus..."
            konfirmasi={`Hapus item "${item.judul}"?\n\nTotal estimasi harga ikut berubah. Tindakan ini tidak bisa dibatalkan.`}
            bahaya
          />
        </div>
      </div>

      {sedangUbah && (
        <div className="mt-3 rounded-lg bg-[#FBF7F4] p-3">
          <FormItemSeserahan
            id={item.id}
            awal={{
              kategori: item.kategori,
              judul: item.judul,
              status: item.status,
              vendor: item.vendor ?? '',
              linkToko: item.linkToko ?? '',
              estimasiHarga:
                item.estimasiHarga === null ? '' : String(Math.trunc(item.estimasiHarga)),
            }}
            saatBerhasil={() => setSedangUbah(false)}
          />
        </div>
      )}
    </li>
  )
}
