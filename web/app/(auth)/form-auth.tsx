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
  placeholder?: string
  defaultValue?: string
  galat?: string
}

// Satu kolom isian lengkap dengan label dan pesan galatnya
function Kolom({ id, label, type, autoComplete, placeholder, defaultValue, galat }: PropsKolom) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-[#3B2A26]">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        aria-invalid={galat ? true : undefined}
        aria-describedby={galat ? `${id}-galat` : undefined}
        className="w-full rounded-lg border border-[#E6D3C9] bg-white/90 px-3.5 py-2.5 text-sm text-[#3B2A26] outline-none transition placeholder:text-[#B3A199] focus:border-[#B8924A] focus:ring-2 focus:ring-[#B8924A]/30 aria-[invalid=true]:border-[#B42318]"
      />
      {galat && (
        <p id={`${id}-galat`} className="text-xs text-[#B42318]">
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
    <div className="rounded-2xl border border-white/20 bg-white/10 p-7 shadow-[0_24px_60px_-24px_rgba(159,92,76,0.4)] backdrop-blur-xl sm:p-8">
      <h2 className="text-xl font-semibold tracking-tight">
        {adalahDaftar ? 'Mulai persiapan pernikahanmu' : 'Selamat datang kembali'}
      </h2>
      <p className="mt-1 mb-6 text-sm text-[#6B524B]">
        {adalahDaftar
          ? 'Buat akun untuk mengelola budget, vendor, dan tamu.'
          : 'Masuk untuk melanjutkan persiapanmu.'}
      </p>

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
          placeholder="nama@email.com"
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
            className="rounded-lg bg-[#FEF3F2] px-3.5 py-2.5 text-sm text-[#B42318]"
          >
            {status.galat}
          </p>
        )}

        <button
          type="submit"
          disabled={sedangProses}
          className="w-full rounded-lg bg-[#9F5C4C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8A4E40] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8924A] disabled:opacity-60"
        >
          {sedangProses ? 'Memproses...' : adalahDaftar ? 'Daftar' : 'Masuk'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#6B524B]">
        {adalahDaftar ? 'Sudah punya akun? ' : 'Belum punya akun? '}
        <Link
          href={adalahDaftar ? '/masuk' : '/daftar'}
          className="font-semibold text-[#9F5C4C] hover:underline"
        >
          {adalahDaftar ? 'Masuk' : 'Daftar'}
        </Link>
      </p>
    </div>
  )
}