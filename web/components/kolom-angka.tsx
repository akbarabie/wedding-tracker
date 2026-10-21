'use client'

import { useState, type ChangeEvent } from 'react'
import { KELAS_INPUT } from './kolom'

// Mengambil hanya angka dari teks apa pun, termasuk hasil tempel (paste).
// Nol di depan dibuang supaya "007" menjadi "7", tetapi "0" tetap "0".
function ambilAngka(teks: string, maksDigit: number): string {
  return teks.replace(/\D/g, '').slice(0, maksDigit).replace(/^0+(?=\d)/, '')
}

type PropsKolomAngka = {
  id: string
  label: string
  // Nilai awal berupa angka murni, misalnya "400"
  defaultValue?: string
  galat?: string
  bantuan?: string
  placeholder?: string
  // Batas banyaknya digit, supaya angka tidak melebihi kolom di database
  maksDigit?: number
}

// Kolom khusus bilangan bulat tanpa pemisah ribuan, misalnya jumlah pax.
// Huruf dan simbol yang diketik atau ditempel langsung dibuang. Pola hidden input
// sama dengan KolomRupiah, jadi isinya tidak ikut ter-reset oleh form action React 19.
export function KolomAngka({
  id,
  label,
  defaultValue,
  galat,
  bantuan,
  placeholder,
  maksDigit = 6,
}: PropsKolomAngka) {
  const [angka, setAngka] = useState(() =>
    ambilAngka(defaultValue ?? '', maksDigit)
  )

  const idDeskripsi = galat
    ? `${id}-galat`
    : bantuan
      ? `${id}-bantuan`
      : undefined

  function saatBerubah(e: ChangeEvent<HTMLInputElement>) {
    setAngka(ambilAngka(e.target.value, maksDigit))
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-[#3B2A26]">
        {label}
      </label>

      {/* Yang dikirim ke server hanya angka murni lewat input tersembunyi */}
      <input type="hidden" name={id} value={angka} />

      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        placeholder={placeholder}
        value={angka}
        onChange={saatBerubah}
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
