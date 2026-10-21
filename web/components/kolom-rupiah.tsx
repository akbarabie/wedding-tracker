'use client'

import { useState, type ChangeEvent } from 'react'
import { KELAS_INPUT } from './kolom'

// Batas 12 digit mengikuti kolom numeric(14,2) di tabel weddings
const MAKS_DIGIT = 12
const AWALAN = 'Rp '

// Mengambil hanya angka dari teks apa pun, termasuk hasil tempel (paste).
// Nol di depan dibuang supaya "007" menjadi "7", tetapi "0" tetap "0".
function ambilAngka(teks: string): string {
  return teks.replace(/\D/g, '').slice(0, MAKS_DIGIT).replace(/^0+(?=\d)/, '')
}

// Memformat "1500000" menjadi "Rp 1.500.000".
// Titik dipasang manual agar hasilnya sama di server dan browser,
// tidak bergantung pada data locale ICU.
function formatRupiah(angka: string): string {
  if (angka === '') return ''
  return AWALAN + angka.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// Mencari posisi kursor setelah digit ke-n pada teks yang sudah diformat,
// supaya kursor tidak melompat ke ujung saat mengedit di tengah angka.
function posisiKursor(teks: string, jumlahDigit: number): number {
  let posisi = teks === '' ? 0 : AWALAN.length
  let hitung = 0
  for (let i = 0; i < teks.length && hitung < jumlahDigit; i++) {
    if (/\d/.test(teks[i])) {
      hitung++
      posisi = i + 1
    }
  }
  return posisi
}

type PropsKolomRupiah = {
  id: string
  nama?: string
  label: string
  // Nilai awal berupa angka murni, misalnya "100000000"
  defaultValue?: string
  galat?: string
  bantuan?: string
}

export function KolomRupiah({
  id,
  nama,
  label,
  defaultValue,
  galat,
  bantuan,
}: PropsKolomRupiah) {
  const [angka, setAngka] = useState(() => ambilAngka(defaultValue ?? ''))

  const idDeskripsi = galat
    ? `${id}-galat`
    : bantuan
      ? `${id}-bantuan`
      : undefined

  function saatBerubah(e: ChangeEvent<HTMLInputElement>) {
    const nilai = e.target.value
    const posisiAwal = e.target.selectionStart ?? nilai.length
    const digitDiKiri = nilai.slice(0, posisiAwal).replace(/\D/g, '').length

    const angkaBaru = ambilAngka(nilai)
    const teks = formatRupiah(angkaBaru)

    // Teks dan kursor diatur langsung di elemen sebelum React merender ulang.
    // Karena isinya sudah sama dengan state, React tidak menimpanya lagi
    // dan kursor tetap di tempat. Huruf atau simbol yang diketik langsung hilang.
    e.target.value = teks
    const posisi = posisiKursor(teks, digitDiKiri)
    e.target.setSelectionRange(posisi, posisi)

    setAngka(angkaBaru)
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-[#3B2A26]">
        {label}
      </label>

      {/* Yang dikirim ke server hanya angka murni lewat input tersembunyi */}
      <input type="hidden" name={nama ?? id} value={angka} />

      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="Rp 150.000.000"
        value={formatRupiah(angka)}
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
