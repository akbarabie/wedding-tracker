'use client'

import { useActionState } from 'react'
import type { StatusForm } from '@/lib/validasi/status-form'

type PropsTombolAksi = {
  // Server Action yang dijalankan saat tombol ditekan
  aksi: (sebelumnya: StatusForm, formData: FormData) => Promise<StatusForm>
  // Nilai tersembunyi yang ikut dikirim, misalnya id baris
  nilai: Record<string, string>
  label: string
  labelProses: string
  konfirmasi?: string
  bahaya?: boolean
}

// Tombol kecil untuk aksi sekali tekan (hapus, tandai dibayar) dengan pesan galatnya
export function TombolAksi({
  aksi,
  nilai,
  label,
  labelProses,
  konfirmasi,
  bahaya,
}: PropsTombolAksi) {
  const [status, aksiForm, sedangProses] = useActionState(aksi, {})

  return (
    <form
      action={aksiForm}
      onSubmit={(e) => {
        if (konfirmasi && !window.confirm(konfirmasi)) e.preventDefault()
      }}
      className="inline-block"
    >
      {Object.entries(nilai).map(([kunci, isi]) => (
        <input key={kunci} type="hidden" name={kunci} value={isi} />
      ))}
      <button
        type="submit"
        disabled={sedangProses}
        className={`rounded-lg border border-[#E8DDD8] px-3 py-1.5 text-sm transition hover:bg-[#FBF7F4] disabled:opacity-60 ${
          bahaya ? 'text-[#B42318]' : 'text-[#3B2A26]'
        }`}
      >
        {sedangProses ? labelProses : label}
      </button>
      {status.galat && (
        <p role="alert" className="mt-1 text-xs text-[#B42318]">
          {status.galat}
        </p>
      )}
    </form>
  )
}