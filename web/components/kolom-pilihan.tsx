'use client'

import type { ChangeEvent, ReactNode } from 'react'
import { KELAS_INPUT } from '@/components/kolom'

type PropsKolomPilihan = {
  id: string
  // Nama field yang dikirim form. Bawaannya sama dengan id (lihat Kolom)
  nama?: string
  label: string
  // Tidak terkontrol: nilai awal saja. Cocok untuk form yang kolomnya tidak saling bergantung.
  defaultValue?: string
  // Terkontrol: nilai dipegang oleh pemanggil lewat state. Dipakai bersama onChange, dan
  // sebaiknya pada form yang dikirim dengan onSubmit karena form action React 19 mereset
  // tampilan select terkontrol ke nilai awalnya.
  value?: string
  galat?: string
  // Dipakai bila halaman perlu bereaksi terhadap pilihan, misalnya menampilkan kolom tambahan
  onChange?: (nilai: string) => void
  children: ReactNode
}

// Kolom pilihan (select) dengan label dan pesan galat, tampilannya sama dengan Kolom
export function KolomPilihan({
  id,
  nama,
  label,
  defaultValue,
  value,
  galat,
  onChange,
  children,
}: PropsKolomPilihan) {
  const propsBersama = {
    id,
    name: nama ?? id,
    onChange: (e: ChangeEvent<HTMLSelectElement>) => onChange?.(e.target.value),
    'aria-invalid': galat ? true : undefined,
    'aria-describedby': galat ? `${id}-galat` : undefined,
    className: KELAS_INPUT,
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-[#3B2A26]">
        {label}
      </label>
      {/* key mengikuti defaultValue. React 19 mereset form otomatis setelah Server Action
          berhasil, dan select tidak terkontrol mengabaikan perubahan defaultValue sesudah
          dirender, sehingga pilihan kembali ke nilai lama. Dengan key, select dibuat ulang
          bila nilai awalnya berubah (misalnya setelah data tersimpan atau setelah galat validasi). */}
      {value !== undefined ? (
        // Terkontrol: tanpa key dan defaultValue, keduanya milik mode tidak terkontrol
        <select {...propsBersama} value={value}>
          {children}
        </select>
      ) : (
        <select key={defaultValue ?? ''} {...propsBersama} defaultValue={defaultValue}>
          {children}
        </select>
      )}
      {galat && (
        <p id={`${id}-galat`} className="text-xs text-[#B42318]">
          {galat}
        </p>
      )}
    </div>
  )
}