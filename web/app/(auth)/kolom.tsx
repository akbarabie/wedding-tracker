import type { HTMLAttributes } from 'react'

// Gaya tombol utama pada form auth
export const KELAS_TOMBOL =
  'w-full rounded-lg bg-[#9F5C4C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8A4E40] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8924A] disabled:opacity-60'

// Gaya kolom isian, diekspor agar kolom khusus (misalnya rupiah) tampil sama
export const KELAS_INPUT =
  'w-full rounded-lg border border-[#E6D3C9] bg-white/90 px-3.5 py-2.5 text-sm text-[#3B2A26] outline-none transition placeholder:text-[#B3A199] focus:border-[#B8924A] focus:ring-2 focus:ring-[#B8924A]/30 aria-[invalid=true]:border-[#B42318]'

type PropsKolom = {
  id: string
  label: string
  type: string
  autoComplete?: string
  placeholder?: string
  defaultValue?: string
  galat?: string
  // Teks bantuan kecil di bawah kolom, disembunyikan saat ada galat
  bantuan?: string
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
  // Dipakai kolom tanggal untuk membatasi tanggal paling awal
  min?: string
}

// Satu kolom isian lengkap dengan label, teks bantuan, dan pesan galatnya
export function Kolom({
  id,
  label,
  type,
  autoComplete,
  placeholder,
  defaultValue,
  galat,
  bantuan,
  inputMode,
  min,
}: PropsKolom) {
  const idDeskripsi = galat
    ? `${id}-galat`
    : bantuan
      ? `${id}-bantuan`
      : undefined

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
        inputMode={inputMode}
        min={min}
        aria-invalid={galat ? true : undefined}
        aria-describedby={idDeskripsi}
        className={KELAS_INPUT}
      />
      {galat ? (
        <p id={`${id}-galat`} className="text-xs text-[#B42318]">
          {galat}
        </p>
      ) : bantuan ? (
        <p id={`${id}-bantuan`} className="text-xs text-[#6B524B]">
          {bantuan}
        </p>
      ) : null}
    </div>
  )
}
