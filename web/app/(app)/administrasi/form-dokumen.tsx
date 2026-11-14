'use client'

import { startTransition, useActionState, useState, type FormEvent } from 'react'
import { Kolom, KELAS_TOMBOL } from '@/components/kolom'
import { KolomPilihan } from '@/components/kolom-pilihan'
import { PesanForm } from '@/components/pesan-form'
import { DAFTAR_BERLAKU, LABEL_BERLAKU } from '@/lib/administrasi/label'
import type { StatusForm } from '@/lib/validasi/status-form'
import { tambahDokumen, ubahDokumen } from './actions'

type Props = {
  // Bila id diisi, form bekerja sebagai form ubah. Bila tidak, form tambah.
  id?: string
  // Nilai awal berupa teks, sama seperti yang dikirim form
  awal?: Record<string, string>
  // Dipanggil setelah ubah berhasil, misalnya untuk menutup panel ubah
  saatBerhasil?: () => void
}

export function FormDokumen({ id, awal, saatBerhasil }: Props) {
  // Versi dinaikkan setelah tambah berhasil supaya form dibuat ulang dan isiannya kosong
  const [versi, setVersi] = useState(0)

  const [status, aksi, sedangProses] = useActionState(
    async (sebelumnya: StatusForm, formData: FormData) => {
      const hasil = await (id ? ubahDokumen : tambahDokumen)(sebelumnya, formData)
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
        id={idUnik('judul')}
        nama="judul"
        label="Nama dokumen"
        type="text"
        autoComplete="off"
        placeholder="Contoh: Surat Keterangan Sehat"
        defaultValue={nilai('judul')}
        galat={galat('judul')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <KolomPilihan
          id={idUnik('berlakuUntuk')}
          nama="berlakuUntuk"
          label="Berlaku untuk"
          defaultValue={nilai('berlakuUntuk') || 'keduanya'}
          galat={galat('berlakuUntuk')}
        >
          {DAFTAR_BERLAKU.map((b) => (
            <option key={b} value={b}>
              {LABEL_BERLAKU[b]}
            </option>
          ))}
        </KolomPilihan>

        <Kolom
          id={idUnik('catatan')}
          nama="catatan"
          label="Catatan (boleh dikosongkan)"
          type="text"
          autoComplete="off"
          placeholder="Contoh: bawa asli dan fotocopy"
          defaultValue={nilai('catatan')}
          galat={galat('catatan')}
        />
      </div>

      <PesanForm status={status} />

      <button type="submit" disabled={sedangProses} className={`${KELAS_TOMBOL} sm:w-auto`}>
        {sedangProses ? 'Menyimpan...' : id ? 'Simpan perubahan' : 'Tambah dokumen'}
      </button>
    </form>
  )
}
