'use client'

import { startTransition, useActionState, useState, type FormEvent } from 'react'
import { Kolom, KELAS_TOMBOL } from '@/components/kolom'
import { KolomPilihan } from '@/components/kolom-pilihan'
import { KolomRupiah } from '@/components/kolom-rupiah'
import { PesanForm } from '@/components/pesan-form'
import {
  DAFTAR_KATEGORI_SESERAHAN,
  DAFTAR_STATUS_SESERAHAN,
  LABEL_KATEGORI_SESERAHAN,
  LABEL_STATUS_SESERAHAN,
} from '@/lib/seserahan/label'
import type { StatusForm } from '@/lib/validasi/status-form'
import { tambahItemSeserahan, ubahItemSeserahan } from './actions'

type Props = {
  // Bila id diisi, form bekerja sebagai form ubah. Bila tidak, form tambah.
  id?: string
  // Nilai awal berupa teks, sama seperti yang dikirim form
  awal?: Record<string, string>
  // Dipanggil setelah ubah berhasil, misalnya untuk menutup panel ubah
  saatBerhasil?: () => void
}

export function FormItemSeserahan({ id, awal, saatBerhasil }: Props) {
  // Versi dinaikkan setelah tambah berhasil supaya form dibuat ulang dan isiannya kosong
  const [versi, setVersi] = useState(0)

  const [status, aksi, sedangProses] = useActionState(
    async (sebelumnya: StatusForm, formData: FormData) => {
      const hasil = await (id ? ubahItemSeserahan : tambahItemSeserahan)(
        sebelumnya,
        formData
      )
      if (hasil.info) {
        if (id) saatBerhasil?.()
        else setVersi((v) => v + 1)
      }
      return hasil
    },
    {}
  )

  const nilai = (kunci: string) => status.nilaiLama?.[kunci] ?? awal?.[kunci] ?? ''
  const galat = (kunci: string) => status.galatField?.[kunci]
  // Id unik per form supaya label tidak bentrok saat beberapa panel ubah terbuka
  const idUnik = (kunci: string) => (id ? `${kunci}-${id}` : kunci)

  // Dikirim lewat onSubmit, bukan form action, supaya React 19 tidak mereset
  // pilihan select setelah Server Action selesai (lihat catatan di KolomPilihan).
  function saatKirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    startTransition(() => aksi(data))
  }

  return (
    <form key={versi} onSubmit={saatKirim} noValidate className="space-y-4">
      {id && <input type="hidden" name="id" value={id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <KolomPilihan
          id={idUnik('kategori')}
          nama="kategori"
          label="Kategori"
          defaultValue={nilai('kategori')}
          galat={galat('kategori')}
        >
          <option value="">Pilih kategori</option>
          {DAFTAR_KATEGORI_SESERAHAN.map((k) => (
            <option key={k} value={k}>
              {LABEL_KATEGORI_SESERAHAN[k]}
            </option>
          ))}
        </KolomPilihan>

        <KolomPilihan
          id={idUnik('status')}
          nama="status"
          label="Status"
          defaultValue={nilai('status') || 'perlu_dibeli'}
          galat={galat('status')}
        >
          {DAFTAR_STATUS_SESERAHAN.map((s) => (
            <option key={s} value={s}>
              {LABEL_STATUS_SESERAHAN[s]}
            </option>
          ))}
        </KolomPilihan>
      </div>

      <Kolom
        id={idUnik('judul')}
        nama="judul"
        label="Nama item"
        type="text"
        autoComplete="off"
        placeholder="Contoh: Mukenah"
        defaultValue={nilai('judul')}
        galat={galat('judul')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Kolom
          id={idUnik('vendor')}
          nama="vendor"
          label="Vendor atau brand (boleh dikosongkan)"
          type="text"
          autoComplete="off"
          placeholder="Contoh: Zinny"
          defaultValue={nilai('vendor')}
          galat={galat('vendor')}
        />
        <KolomRupiah
          id={idUnik('estimasiHarga')}
          nama="estimasiHarga"
          label="Estimasi harga (boleh dikosongkan)"
          defaultValue={nilai('estimasiHarga')}
          galat={galat('estimasiHarga')}
        />
      </div>

      <Kolom
        id={idUnik('linkToko')}
        nama="linkToko"
        label="Tautan toko online (boleh dikosongkan)"
        type="text"
        inputMode="url"
        autoComplete="off"
        placeholder="https://..."
        defaultValue={nilai('linkToko')}
        galat={galat('linkToko')}
      />

      <PesanForm status={status} />

      <button type="submit" disabled={sedangProses} className={`${KELAS_TOMBOL} sm:w-auto`}>
        {sedangProses ? 'Menyimpan...' : id ? 'Simpan perubahan' : 'Tambah item'}
      </button>
    </form>
  )
}
