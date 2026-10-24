import type { TingkatPeringatan } from './hitung'

// Warna bar dan teks menurut tingkat pemakaian budget. Dipakai bersama oleh
// halaman Budget dan Ringkasan supaya penandanya selalu sama.
export const WARNA_BAR: Record<TingkatPeringatan, string> = {
  aman: 'bg-[#4F8A5B]',
  dekat: 'bg-[#B8924A]',
  lewat: 'bg-[#B42318]',
  tanpa_rencana: 'bg-[#D9CFCB]',
}

export const WARNA_TEKS: Record<TingkatPeringatan, string> = {
  aman: 'text-[#2E6B3A]',
  dekat: 'text-[#8A6A22]',
  lewat: 'text-[#B42318]',
  tanpa_rencana: 'text-[#6B524B]',
}
