'use client'

import type { ReactNode } from 'react'
import { KELAS_INPUT } from '@/app/(auth)/kolom'

type PropsKolomPilihan = {
  id: string
  label: string
  defaultValue?: string
  galat?: string
  // Dipakai bila halaman perlu bereaksi terhadap pilihan, misalnya menampilkan kolom tambahan
  onChange?: (nilai: string) => void
  children: ReactNode
}

// Kolom pilihan (select) dengan label dan pesan galat, tampilannya sama dengan Kolom
export function KolomPilihan({
  id,
  label,
  defaultValue,
  galat,
  onChange,
  children,
}: PropsKolomPilihan) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-[#3B2A26]">
        {label}
      </label>
      <select
        id={id}
        name={id}
        defaultValue={defaultValue}
        onChange={(e) => onChange?.(e.target.value)}
        aria-invalid={galat ? true : undefined}
        aria-describedby={galat ? `${id}-galat` : undefined}
        className={KELAS_INPUT}
      >
        {children}
      </select>
      {galat && (
        <p id={`${id}-galat`} className="text-xs text-[#B42318]">
          {galat}
        </p>
      )}
    </div>
  )
}