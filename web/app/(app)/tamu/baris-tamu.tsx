'use client'

import { useState, useTransition, type ChangeEvent } from 'react'
import { TombolAksi } from '@/components/tombol-aksi'
import {
  DAFTAR_STATUS_RSVP,
  LABEL_JENIS_UNDANGAN,
  LABEL_STATUS_RSVP,
  labelTamu,
  type JenisUndangan,
  type KategoriTamu,
  type Pihak,
  type StatusRsvp,
} from '@/lib/tamu/label'
import { hapusTamu, ubahStatusRsvp } from './actions'
import { FormTamu } from './form-tamu'

const KELAS_TOMBOL_TEPI =
  'rounded-lg border border-[#E8DDD8] px-3 py-1.5 text-sm text-[#3B2A26] transition hover:bg-[#FBF7F4] disabled:opacity-60'

// Warna pilihan status supaya daftar mudah dipindai sekilas
const WARNA_STATUS: Record<StatusRsvp, string> = {
  belum_konfirmasi: 'border-[#E8DDD8] bg-white text-[#6B524B]',
  hadir: 'border-[#BFDCC5] bg-[#E6F3E8] text-[#2E6B3A]',
  tidak_hadir: 'border-[#F3C9C4] bg-[#FEF3F2] text-[#B42318]',
  ragu: 'border-[#EBD9A8] bg-[#FBF1DC] text-[#8A6A22]',
}

export type DataTamu = {
  id: string
  nama: string
  kategori: KategoriTamu
  // Kosong pada tamu lama yang belum dirinci
  subKategori: string | null
  pihak: Pihak | null
  jenisUndangan: JenisUndangan | null
  kontak: string | null
  statusRsvp: StatusRsvp
  jumlahOrang: number
}

// Pilihan status yang langsung tersimpan saat diganti. Tampilan berubah dulu supaya
// terasa cepat, dan dikembalikan bila penyimpanan gagal. Induknya memberi key yang
// memuat status dari server, jadi komponen ini dibuat ulang saat data server berubah.
function PilihStatus({ id, nilai }: { id: string; nilai: StatusRsvp }) {
  const [pilihan, setPilihan] = useState<StatusRsvp>(nilai)
  const [galat, setGalat] = useState<string | null>(null)
  const [sedangProses, mulai] = useTransition()

  function saatUbah(e: ChangeEvent<HTMLSelectElement>) {
    const baru = e.target.value as StatusRsvp
    const lama = pilihan
    setPilihan(baru)
    setGalat(null)

    mulai(async () => {
      const data = new FormData()
      data.set('id', id)
      data.set('statusRsvp', baru)
      const hasil = await ubahStatusRsvp({}, data)
      if (hasil.galat) {
        setPilihan(lama)
        setGalat(hasil.galat)
      }
    })
  }

  return (
    <div>
      <select
        aria-label="Status kehadiran"
        value={pilihan}
        onChange={saatUbah}
        disabled={sedangProses}
        className={`rounded-lg border px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#B8924A]/40 disabled:opacity-60 ${WARNA_STATUS[pilihan]}`}
      >
        {DAFTAR_STATUS_RSVP.map((s) => (
          <option key={s} value={s}>
            {LABEL_STATUS_RSVP[s]}
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

export function BarisTamu({ tamu }: { tamu: DataTamu }) {
  const [sedangUbah, setSedangUbah] = useState(false)

  return (
    <li className="rounded-xl border border-[#E8DDD8] bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{tamu.nama}</p>
          <p className="text-xs text-[#6B524B]">
            {labelTamu(tamu.kategori, tamu.subKategori, tamu.pihak)},{' '}
            {tamu.jumlahOrang} orang
            {tamu.kontak && `, ${tamu.kontak}`}
          </p>
          <p className="mt-1">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                tamu.jenisUndangan
                  ? 'bg-[#F1E9E5] text-[#6B524B]'
                  : 'border border-dashed border-[#D9CFCB] text-[#8C7A73]'
              }`}
            >
              {tamu.jenisUndangan
                ? `Undangan ${LABEL_JENIS_UNDANGAN[tamu.jenisUndangan]}`
                : 'Jenis undangan belum diisi'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <PilihStatus
            key={`${tamu.id}-${tamu.statusRsvp}`}
            id={tamu.id}
            nilai={tamu.statusRsvp}
          />
          <button
            type="button"
            onClick={() => setSedangUbah((v) => !v)}
            aria-expanded={sedangUbah}
            className={KELAS_TOMBOL_TEPI}
          >
            {sedangUbah ? 'Batal' : 'Ubah'}
          </button>
          <TombolAksi
            aksi={hapusTamu}
            nilai={{ id: tamu.id }}
            label="Hapus"
            labelProses="Menghapus..."
            konfirmasi={`Hapus tamu "${tamu.nama}"?\n\nJumlah tamu dan estimasi konsumsi ikut berubah. Tindakan ini tidak bisa dibatalkan.`}
            bahaya
          />
        </div>
      </div>

      {sedangUbah && (
        <div className="mt-3 rounded-lg bg-[#FBF7F4] p-3">
          <FormTamu
            id={tamu.id}
            awal={{
              nama: tamu.nama,
              kategori: tamu.kategori,
              subKategori: tamu.subKategori ?? '',
              pihak: tamu.pihak ?? '',
              jenisUndangan: tamu.jenisUndangan ?? '',
              kontak: tamu.kontak ?? '',
              jumlahOrang: String(tamu.jumlahOrang),
              statusRsvp: tamu.statusRsvp,
            }}
            saatBerhasil={() => setSedangUbah(false)}
          />
        </div>
      )}
    </li>
  )
}
