'use client'

import { useActionState } from 'react'
import { Kolom } from '../kolom'
import { KolomRupiah } from './kolom-rupiah'
import { buatPernikahan, terimaUndangan } from './actions'
import type { StatusForm } from '@/lib/validasi/status-form'

const STATUS_AWAL: StatusForm = {}

const KELAS_TOMBOL =
  'w-full rounded-lg bg-[#9F5C4C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8A4E40] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8924A] disabled:opacity-60'

// Pesan galat umum dari server
function PesanGalat({ pesan }: { pesan?: string }) {
  if (!pesan) return null
  return (
    <p
      role="alert"
      className="rounded-lg bg-[#FEF3F2] px-3.5 py-2.5 text-sm text-[#B42318]"
    >
      {pesan}
    </p>
  )
}

export function FormBuatPernikahan({ hariIni }: { hariIni: string }) {
  const [status, aksi, sedangProses] = useActionState(
    buatPernikahan,
    STATUS_AWAL
  )

  return (
    // noValidate supaya pesan galat dari Zod (bahasa Indonesia) yang tampil
    <form action={aksi} noValidate className="space-y-4">
      <Kolom
        id="namaPasangan"
        label="Nama pasangan"
        type="text"
        autoComplete="off"
        placeholder="Contoh: Rina & Dimas"
        defaultValue={status.nilaiLama?.namaPasangan}
        galat={status.galatField?.namaPasangan}
      />
      <Kolom
        id="tanggalHariH"
        label="Tanggal hari H (opsional)"
        type="date"
        min={hariIni}
        defaultValue={status.nilaiLama?.tanggalHariH}
        galat={status.galatField?.tanggalHariH}
        bantuan="Boleh dikosongkan dulu kalau tanggalnya belum pasti."
      />
      <KolomRupiah
        id="budgetTotal"
        label="Budget total resepsi (opsional)"
        defaultValue={status.nilaiLama?.budgetTotal}
        galat={status.galatField?.budgetTotal}
        bantuan="Tidak termasuk cincin, seserahan, dan mahar."
      />

      <PesanGalat pesan={status.galat} />

      <button type="submit" disabled={sedangProses} className={KELAS_TOMBOL}>
        {sedangProses ? 'Memproses...' : 'Buat pernikahan'}
      </button>
    </form>
  )
}

export function FormTerimaUndangan({ undanganId }: { undanganId: string }) {
  const [status, aksi, sedangProses] = useActionState(
    terimaUndangan,
    STATUS_AWAL
  )

  return (
    <form action={aksi} className="space-y-4">
      <input type="hidden" name="undanganId" value={undanganId} />

      <PesanGalat pesan={status.galat} />

      <button type="submit" disabled={sedangProses} className={KELAS_TOMBOL}>
        {sedangProses ? 'Memproses...' : 'Terima undangan'}
      </button>
    </form>
  )
}
