'use client'

import { useActionState } from 'react'
import { KELAS_TOMBOL } from '@/components/kolom'
import type { StatusForm } from '@/lib/validasi/status-form'

const KELAS_SEKUNDER =
  'rounded-lg border border-[#E8DDD8] bg-white px-4 py-2 text-sm font-medium text-[#3B2A26] transition hover:bg-[#FBF7F4] disabled:opacity-60'

type Props = {
  // Server Action pengisi template, tanpa parameter
  aksi: () => Promise<StatusForm>
  label: string
  // utama untuk keadaan kosong, sekunder untuk pemakaian berikutnya
  varian: 'utama' | 'sekunder'
  // Bila diisi, pengguna diminta konfirmasi dulu sebelum item ditambahkan
  konfirmasi?: string
}

// Tombol umum untuk mengisi template bawaan sebuah modul (opt-in)
export function TombolTemplate({ aksi, label, varian, konfirmasi }: Props) {
  const [status, jalankan, sedangProses] = useActionState(aksi, {})

  return (
    <form
      action={jalankan}
      onSubmit={(e) => {
        if (konfirmasi && !window.confirm(konfirmasi)) e.preventDefault()
      }}
    >
      <button
        type="submit"
        disabled={sedangProses}
        className={varian === 'utama' ? `${KELAS_TOMBOL} sm:w-auto` : KELAS_SEKUNDER}
      >
        {sedangProses ? 'Menambahkan...' : label}
      </button>
      {status.info && (
        <p role="status" className="mt-2 text-xs text-[#2E6B3A]">
          {status.info}
        </p>
      )}
      {status.galat && (
        <p role="alert" className="mt-2 text-xs text-[#B42318]">
          {status.galat}
        </p>
      )}
    </form>
  )
}
