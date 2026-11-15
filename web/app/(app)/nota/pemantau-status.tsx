'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const JEDA_MS = 5000
// 60 kali 5 detik, jadi pemantauan berhenti sendiri setelah 5 menit
const BATAS_SEGARKAN = 60

// Memuat ulang data halaman secara berkala selama masih ada nota yang menunggu atau
// sedang dibaca, supaya status berubah tanpa pengguna menekan muat ulang.
// Berhenti sendiri bila semua nota sudah selesai atau batas waktu tercapai.
export function PemantauStatus({ aktif }: { aktif: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!aktif) return
    let hitungan = 0
    const pewaktu = setInterval(() => {
      hitungan += 1
      if (hitungan > BATAS_SEGARKAN) {
        clearInterval(pewaktu)
        return
      }
      router.refresh()
    }, JEDA_MS)
    return () => clearInterval(pewaktu)
  }, [aktif, router])

  return null
}
