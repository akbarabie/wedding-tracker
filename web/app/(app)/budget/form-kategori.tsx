'use client'

import { useActionState, useState } from 'react'
import { Kolom, KELAS_INPUT } from '@/app/(auth)/kolom'
import { KolomRupiah } from '@/app/(auth)/mulai/kolom-rupiah'
import { hapusKategori, tambahKategori, ubahKategori } from './actions'
import type { StatusForm } from '@/lib/validasi/status-form'

const STATUS_AWAL: StatusForm = {}

const KELAS_TOMBOL =
  'rounded-lg bg-[#9F5C4C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8A4E40] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8924A] disabled:opacity-60'

const KELAS_TOMBOL_TEPI =
  'rounded-lg border border-[#E8DDD8] px-3 py-1.5 text-sm text-[#3B2A26] transition hover:bg-[#FBF7F4] disabled:opacity-60'

function Pesan({ status }: { status: StatusForm }) {
  if (status.galat) {
    return (
      <p
        role="alert"
        className="rounded-lg bg-[#FEF3F2] px-3.5 py-2.5 text-sm text-[#B42318]"
      >
        {status.galat}
      </p>
    )
  }
  if (status.info) {
    return (
      <p role="status" className="text-sm text-[#2E6B3A]">
        {status.info}
      </p>
    )
  }
  return null
}

export function FormTambahKategori() {
  // Versi dinaikkan setelah berhasil supaya kolom rupiah (yang menyimpan
  // nilainya sendiri) ikut kosong lagi bersama kolom lain yang direset React.
  const [versi, setVersi] = useState(0)
  const [status, aksi, sedangProses] = useActionState(
    async (sebelumnya: StatusForm, formData: FormData) => {
      const hasil = await tambahKategori(sebelumnya, formData)
      if (hasil.info) setVersi((v) => v + 1)
      return hasil
    },
    STATUS_AWAL
  )

  return (
    <form action={aksi} noValidate className="space-y-4">
      <Kolom
        id="nama"
        label="Nama kategori"
        type="text"
        autoComplete="off"
        placeholder="Contoh: Transportasi"
        defaultValue={status.nilaiLama?.nama}
        galat={status.galatField?.nama}
      />
      <KolomRupiah
        key={versi}
        id="nilaiRencana"
        label="Nilai rencana"
        defaultValue={status.nilaiLama?.nilaiRencana}
        galat={status.galatField?.nilaiRencana}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="diLuarResepsi"
          defaultChecked={status.nilaiLama?.diLuarResepsi === 'on'}
          className="size-4 accent-[#9F5C4C]"
        />
        Di luar budget resepsi
      </label>

      <Pesan status={status} />

      <button type="submit" disabled={sedangProses} className={KELAS_TOMBOL}>
        {sedangProses ? 'Menyimpan...' : 'Tambah kategori'}
      </button>
    </form>
  )
}

type PropsAksi = {
  id: string
  nama: string
  nilaiRencana: number
}

// Tombol ubah dan hapus pada satu baris kategori
export function AksiKategori({ id, nama, nilaiRencana }: PropsAksi) {
  const [sedangUbah, setSedangUbah] = useState(false)

  const [statusUbah, aksiUbah, prosesUbah] = useActionState(
    async (sebelumnya: StatusForm, formData: FormData) => {
      const hasil = await ubahKategori(sebelumnya, formData)
      if (hasil.info) setSedangUbah(false)
      return hasil
    },
    STATUS_AWAL
  )

  const [statusHapus, aksiHapus, prosesHapus] = useActionState(
    hapusKategori,
    STATUS_AWAL
  )

  return (
    <div className="mt-3 space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSedangUbah((v) => !v)}
          aria-expanded={sedangUbah}
          className={KELAS_TOMBOL_TEPI}
        >
          {sedangUbah ? 'Batal' : 'Ubah'}
        </button>

        <form
          action={aksiHapus}
          onSubmit={(e) => {
            if (!window.confirm(`Hapus kategori "${nama}"?`)) e.preventDefault()
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={prosesHapus}
            className={`${KELAS_TOMBOL_TEPI} text-[#B42318]`}
          >
            {prosesHapus ? 'Menghapus...' : 'Hapus'}
          </button>
        </form>
      </div>

      <Pesan status={statusHapus} />

      {sedangUbah && (
        <form
          action={aksiUbah}
          noValidate
          className="space-y-3 rounded-lg bg-[#FBF7F4] p-3"
        >
          <input type="hidden" name="id" value={id} />

          <div className="space-y-1.5">
            <label
              htmlFor={`nama-${id}`}
              className="block text-sm font-medium text-[#3B2A26]"
            >
              Nama kategori
            </label>
            <input
              id={`nama-${id}`}
              name="nama"
              type="text"
              autoComplete="off"
              defaultValue={statusUbah.nilaiLama?.nama ?? nama}
              className={KELAS_INPUT}
            />
            {statusUbah.galatField?.nama && (
              <p className="text-xs text-[#B42318]">
                {statusUbah.galatField.nama}
              </p>
            )}
          </div>

          <KolomRupiah
            id={`nilai-${id}`}
            nama="nilaiRencana"
            label="Nilai rencana"
            defaultValue={statusUbah.nilaiLama?.nilaiRencana ?? String(nilaiRencana)}
            galat={statusUbah.galatField?.nilaiRencana}
          />

          <Pesan status={statusUbah} />

          <button type="submit" disabled={prosesUbah} className={KELAS_TOMBOL}>
            {prosesUbah ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      )}
    </div>
  )
}