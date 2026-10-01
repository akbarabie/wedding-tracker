'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { daftar, masuk } from './actions'
import type { StatusForm } from '@/lib/validasi/status-form'

const STATUS_AWAL: StatusForm = {}

type PropsKolom = {
  id: string
  label: string
  type: string
  autoComplete: string
  defaultValue?: string
  galat?: string
}

// Satu kolom isian lengkap dengan label dan pesan galatnya
function Kolom({ id, label, type, autoComplete, defaultValue, galat }: PropsKolom) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={galat ? true : undefined}
        aria-describedby={galat ? `${id}-galat` : undefined}
        className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 dark:border-zinc-700"
      />
      {galat && (
        <p id={`${id}-galat`} className="text-xs text-red-500">
          {galat}
        </p>
      )}
    </div>
  )
}

export default function FormAuth({ mode }: { mode: 'masuk' | 'daftar' }) {
  const adalahDaftar = mode === 'daftar'
  const [status, aksi, sedangProses] = useActionState(
    adalahDaftar ? daftar : masuk,
    STATUS_AWAL
  )

  return (
    <div className="rounded-xl border border-zinc-200 p-6 shadow-sm dark:border-zinc-800">
      <h2 className="mb-6 text-lg font-semibold">
        {adalahDaftar ? 'Buat akun' : 'Masuk ke akunmu'}
      </h2>

      {/* noValidate supaya pesan galat dari Zod (bahasa Indonesia) yang tampil */}
      <form action={aksi} noValidate className="space-y-4">
        {adalahDaftar && (
          <Kolom
            id="nama"
            label="Nama lengkap"
            type="text"
            autoComplete="name"
            defaultValue={status.nilaiLama?.nama}
            galat={status.galatField?.nama}
          />
        )}
        <Kolom
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          defaultValue={status.nilaiLama?.email}
          galat={status.galatField?.email}
        />
        <Kolom
          id="sandi"
          label="Kata sandi"
          type="password"
          autoComplete={adalahDaftar ? 'new-password' : 'current-password'}
          galat={status.galatField?.sandi}
        />

        {status.galat && (
          <p
            role="alert"
            className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-500"
          >
            {status.galat}
          </p>
        )}

        <button
          type="submit"
          disabled={sedangProses}
          className="w-full rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {sedangProses ? 'Memproses...' : adalahDaftar ? 'Daftar' : 'Masuk'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        {adalahDaftar ? 'Sudah punya akun? ' : 'Belum punya akun? '}
        <Link
          href={adalahDaftar ? '/masuk' : '/daftar'}
          className="font-medium text-rose-600 hover:underline"
        >
          {adalahDaftar ? 'Masuk' : 'Daftar'}
        </Link>
      </p>
    </div>
  )
}