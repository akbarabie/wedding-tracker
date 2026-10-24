'use client'

import { startTransition, useActionState, useState, type FormEvent } from 'react'
import { Kolom, KELAS_TOMBOL } from '@/components/kolom'
import { KolomPilihan } from '@/components/kolom-pilihan'
import { PesanForm } from '@/components/pesan-form'
import { DAFTAR_FASE, LABEL_FASE } from '@/lib/timeline/label'
import type { StatusForm } from '@/lib/validasi/status-form'
import { tambahTugas, ubahTugas } from './actions'

export type OpsiPenanggungJawab = { id: string; label: string }

type Props = {
  // Kosong bila pernikahan hanya punya satu anggota, kolom penanggung jawab disembunyikan
  anggota: OpsiPenanggungJawab[]
  // Bila id diisi, form bekerja sebagai form ubah. Bila tidak, form tambah.
  id?: string
  // Nilai awal berupa teks, sama seperti yang dikirim form
  awal?: Record<string, string>
  // Dipanggil setelah ubah berhasil, misalnya untuk menutup panel ubah
  saatBerhasil?: () => void
}

export function FormTugas({ anggota, id, awal, saatBerhasil }: Props) {
  // Versi dinaikkan setelah tambah berhasil supaya form dibuat ulang dan isiannya kosong
  const [versi, setVersi] = useState(0)

  const [status, aksi, sedangProses] = useActionState(
    async (sebelumnya: StatusForm, formData: FormData) => {
      const hasil = await (id ? ubahTugas : tambahTugas)(sebelumnya, formData)
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
        id={id ? `judul-${id}` : 'judul'}
        nama="judul"
        label="Judul tugas"
        type="text"
        autoComplete="off"
        placeholder="Contoh: Survei tiga kandidat venue"
        defaultValue={nilai('judul')}
        galat={galat('judul')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <KolomPilihan
          id={id ? `fase-${id}` : 'fase'}
          nama="fase"
          label="Fase"
          defaultValue={nilai('fase') || '1'}
          galat={galat('fase')}
        >
          {DAFTAR_FASE.map((f) => (
            <option key={f} value={String(f)}>
              Fase {f}: {LABEL_FASE[f]}
            </option>
          ))}
        </KolomPilihan>

        <Kolom
          id={id ? `deadline-${id}` : 'deadline'}
          nama="deadline"
          label="Deadline (boleh dikosongkan)"
          type="date"
          min="2020-01-01"
          defaultValue={nilai('deadline')}
          galat={galat('deadline')}
        />
      </div>

      {anggota.length > 0 && (
        <KolomPilihan
          id={id ? `penanggungJawab-${id}` : 'penanggungJawab'}
          nama="penanggungJawab"
          label="Penanggung jawab"
          defaultValue={nilai('penanggungJawab')}
          galat={galat('penanggungJawab')}
        >
          <option value="">Belum ditentukan</option>
          {anggota.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </KolomPilihan>
      )}

      <PesanForm status={status} />

      <button type="submit" disabled={sedangProses} className={`${KELAS_TOMBOL} sm:w-auto`}>
        {sedangProses ? 'Menyimpan...' : id ? 'Simpan perubahan' : 'Tambah tugas'}
      </button>
    </form>
  )
}
