'use client'

import { startTransition, useActionState, useState, type FormEvent } from 'react'
import { Kolom, KELAS_TOMBOL } from '@/components/kolom'
import { KolomAngka } from '@/components/kolom-angka'
import { KolomPilihan } from '@/components/kolom-pilihan'
import { PesanForm } from '@/components/pesan-form'
import {
  DAFTAR_KATEGORI_TAMU,
  DAFTAR_STATUS_RSVP,
  LABEL_KATEGORI_TAMU,
  LABEL_STATUS_RSVP,
} from '@/lib/tamu/label'
import type { StatusForm } from '@/lib/validasi/status-form'
import { tambahTamu, ubahTamu } from './actions'

type Props = {
  // Bila id diisi, form bekerja sebagai form ubah. Bila tidak, form tambah.
  id?: string
  // Nilai awal berupa teks, sama seperti yang dikirim form
  awal?: Record<string, string>
  // Dipanggil setelah ubah berhasil, misalnya untuk menutup panel ubah
  saatBerhasil?: () => void
}

export function FormTamu({ id, awal, saatBerhasil }: Props) {
  // Versi dinaikkan setelah tambah berhasil supaya form dibuat ulang dan isiannya kosong
  const [versi, setVersi] = useState(0)

  const [status, aksi, sedangProses] = useActionState(
    async (sebelumnya: StatusForm, formData: FormData) => {
      const hasil = await (id ? ubahTamu : tambahTamu)(sebelumnya, formData)
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

      <Kolom
        id={idUnik('nama')}
        nama="nama"
        label="Nama tamu"
        type="text"
        autoComplete="off"
        placeholder="Contoh: Keluarga Bapak Hendra"
        defaultValue={nilai('nama')}
        galat={galat('nama')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <KolomPilihan
          id={idUnik('kategori')}
          nama="kategori"
          label="Kategori"
          defaultValue={nilai('kategori') || 'keluarga'}
          galat={galat('kategori')}
        >
          {DAFTAR_KATEGORI_TAMU.map((k) => (
            <option key={k} value={k}>
              {LABEL_KATEGORI_TAMU[k]}
            </option>
          ))}
        </KolomPilihan>

        <KolomPilihan
          id={idUnik('statusRsvp')}
          nama="statusRsvp"
          label="Status kehadiran"
          defaultValue={nilai('statusRsvp') || 'belum_konfirmasi'}
          galat={galat('statusRsvp')}
        >
          {DAFTAR_STATUS_RSVP.map((s) => (
            <option key={s} value={s}>
              {LABEL_STATUS_RSVP[s]}
            </option>
          ))}
        </KolomPilihan>

        <KolomAngka
          id={idUnik('jumlahOrang')}
          nama="jumlahOrang"
          label="Jumlah orang"
          defaultValue={nilai('jumlahOrang') || '1'}
          maksDigit={2}
          bantuan="Berapa orang yang diundang lewat undangan ini, 1 sampai 20."
          galat={galat('jumlahOrang')}
        />

        <Kolom
          id={idUnik('kontak')}
          nama="kontak"
          label="Kontak (boleh dikosongkan)"
          type="text"
          autoComplete="off"
          placeholder="Nomor telepon atau akun"
          defaultValue={nilai('kontak')}
          galat={galat('kontak')}
        />
      </div>

      <PesanForm status={status} />

      <button type="submit" disabled={sedangProses} className={`${KELAS_TOMBOL} sm:w-auto`}>
        {sedangProses ? 'Menyimpan...' : id ? 'Simpan perubahan' : 'Tambah tamu'}
      </button>
    </form>
  )
}
