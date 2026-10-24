'use client'

import { useActionState } from 'react'
import { KELAS_TOMBOL } from '@/components/kolom'
import { isiTemplateTugas } from './actions'

const KELAS_SEKUNDER =
  'rounded-lg border border-[#E8DDD8] bg-white px-4 py-2 text-sm font-medium text-[#3B2A26] transition hover:bg-[#FBF7F4] disabled:opacity-60'

type Props = {
  // utama untuk keadaan timeline kosong, sekunder untuk pemakaian berikutnya
  varian: 'utama' | 'sekunder'
  // Bila diisi, pengguna diminta konfirmasi dulu sebelum tugas ditambahkan
  konfirmasi?: string
}

export function TombolTemplate({ varian, konfirmasi }: Props) {
  const [status, aksi, sedangProses] = useActionState(isiTemplateTugas, {})

  return (
    <form
      action={aksi}
      onSubmit={(e) => {
        if (konfirmasi && !window.confirm(konfirmasi)) e.preventDefault()
      }}
    >
      <button
        type="submit"
        disabled={sedangProses}
        className={varian === 'utama' ? `${KELAS_TOMBOL} sm:w-auto` : KELAS_SEKUNDER}
      >
        {sedangProses ? 'Menambahkan...' : 'Tambahkan tugas template'}
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
