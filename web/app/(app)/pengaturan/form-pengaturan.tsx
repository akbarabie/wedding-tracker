'use client'

import { startTransition, useActionState, type FormEvent } from 'react'
import { Kolom, KELAS_TOMBOL } from '@/components/kolom'
import { KolomRupiah } from '@/components/kolom-rupiah'
import { PesanForm } from '@/components/pesan-form'
import { ubahPernikahan } from './actions'

type Props = {
  // Nilai tersimpan saat ini, sebagai teks seperti yang dikirim form
  awal: { namaPasangan: string; tanggalHariH: string; budgetTotal: string }
  // Batas paling awal pada pemilih tanggal. Kosong bila hari H tersimpan sudah lewat,
  // supaya tanggal itu tetap bisa tampil di pemilih tanggal.
  tanggalPalingAwal?: string
}

export function FormPengaturan({ awal, tanggalPalingAwal }: Props) {
  const [status, aksi, sedangProses] = useActionState(ubahPernikahan, {})

  const nilai = (kunci: keyof Props['awal']) =>
    status.nilaiLama?.[kunci] ?? awal[kunci]

  // Dikirim lewat onSubmit, bukan form action, supaya React 19 tidak mereset isian
  // setelah Server Action selesai. Isian pengguna tetap apa adanya, sama dengan
  // yang baru saja tersimpan.
  function saatKirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    startTransition(() => aksi(data))
  }

  return (
    <form onSubmit={saatKirim} noValidate className="space-y-4">
      <Kolom
        id="namaPasangan"
        label="Nama pasangan"
        type="text"
        autoComplete="off"
        defaultValue={nilai('namaPasangan')}
        galat={status.galatField?.namaPasangan}
      />
      <Kolom
        id="tanggalHariH"
        label="Tanggal hari H (boleh dikosongkan)"
        type="date"
        min={tanggalPalingAwal}
        defaultValue={nilai('tanggalHariH')}
        galat={status.galatField?.tanggalHariH}
        bantuan="Dipakai untuk hitung mundur dan penanda fase yang sedang berjalan di Timeline."
      />
      <KolomRupiah
        id="budgetTotal"
        label="Budget total resepsi"
        defaultValue={nilai('budgetTotal')}
        galat={status.galatField?.budgetTotal}
        bantuan="Tidak termasuk cincin, seserahan, dan mahar."
      />

      <PesanForm status={status} />

      <button type="submit" disabled={sedangProses} className={`${KELAS_TOMBOL} sm:w-auto`}>
        {sedangProses ? 'Menyimpan...' : 'Simpan pengaturan'}
      </button>
    </form>
  )
}
