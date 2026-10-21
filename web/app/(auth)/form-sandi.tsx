'use client'

import { useActionState } from 'react'
import { aturUlangSandi, mintaResetSandi } from './actions'
import { KELAS_TOMBOL, Kolom } from '@/components/kolom'
import { PesanStatus } from './pesan-status'
import { Turnstile } from './turnstile'
import type { StatusForm } from '@/lib/validasi/status-form'

const STATUS_AWAL: StatusForm = {}

// Form meminta tautan reset: hanya satu kolom email
export function FormLupaSandi() {
  const [status, aksi, sedangProses] = useActionState(
    mintaResetSandi,
    STATUS_AWAL
  )

  return (
    // noValidate supaya pesan galat dari Zod (bahasa Indonesia) yang tampil
    <form action={aksi} noValidate className="space-y-4">
      <Kolom
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="nama@email.com"
        defaultValue={status.nilaiLama?.email}
        galat={status.galatField?.email}
      />

      <Turnstile kunciReset={status} />

      <PesanStatus status={status} />

      <button type="submit" disabled={sedangProses} className={KELAS_TOMBOL}>
        {sedangProses ? 'Mengirim...' : 'Kirim tautan reset'}
      </button>
    </form>
  )
}

// Form kata sandi baru, hanya muncul setelah pengguna membuka tautan dari email
export function FormAturUlangSandi() {
  const [status, aksi, sedangProses] = useActionState(
    aturUlangSandi,
    STATUS_AWAL
  )

  return (
    <form action={aksi} noValidate className="space-y-4">
      <Kolom
        id="sandi"
        label="Kata sandi baru"
        type="password"
        autoComplete="new-password"
        galat={status.galatField?.sandi}
        bantuan="Minimal 8 karakter."
      />
      <Kolom
        id="konfirmasi"
        label="Ulangi kata sandi baru"
        type="password"
        autoComplete="new-password"
        galat={status.galatField?.konfirmasi}
      />

      <PesanStatus status={status} />

      <button type="submit" disabled={sedangProses} className={KELAS_TOMBOL}>
        {sedangProses ? 'Menyimpan...' : 'Simpan kata sandi baru'}
      </button>
    </form>
  )
}
