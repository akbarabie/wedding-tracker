import {
  DAFTAR_KATEGORI_SESERAHAN,
  DAFTAR_STATUS_SESERAHAN,
  type KategoriSeserahan,
  type StatusSeserahan,
} from './label'

export type ItemHitung = {
  kategori: string
  status: string
  // numeric dari database bisa tiba sebagai teks, dan kosong berarti belum diketahui
  estimasi_harga: number | string | null
}

type Subtotal = { total: number; selesai: number; estimasi: number; tanpaHarga: number }

export type RingkasanSeserahan = {
  total: number
  perStatus: Record<StatusSeserahan, number>
  // Jumlah seluruh estimasi harga yang sudah diisi
  estimasi: number
  // Item yang estimasi harganya belum diisi, supaya total tidak dianggap lengkap
  tanpaHarga: number
  perKategori: Record<KategoriSeserahan, Subtotal>
  persenSelesai: number
}

function kosongSubtotal(): Subtotal {
  return { total: 0, selesai: 0, estimasi: 0, tanpaHarga: 0 }
}

// Ringkasan seserahan: jumlah per status, total estimasi harga, dan subtotal per kategori
// (baris "Total" per kelompok di planner referensi). Item dengan kategori atau status
// tak dikenal dilewati. Item tanpa estimasi dihitung terpisah, bukan sebagai nol.
export function ringkasSeserahan(items: ItemHitung[]): RingkasanSeserahan {
  const perKategori = Object.fromEntries(
    DAFTAR_KATEGORI_SESERAHAN.map((k) => [k, kosongSubtotal()])
  ) as Record<KategoriSeserahan, Subtotal>
  const perStatus = Object.fromEntries(
    DAFTAR_STATUS_SESERAHAN.map((s) => [s, 0])
  ) as Record<StatusSeserahan, number>

  let total = 0
  let estimasi = 0
  let tanpaHarga = 0

  for (const item of items) {
    const kategori = item.kategori as KategoriSeserahan
    const status = item.status as StatusSeserahan
    if (!(kategori in perKategori) || !(status in perStatus)) continue

    total += 1
    perStatus[status] += 1
    perKategori[kategori].total += 1
    if (status === 'selesai') perKategori[kategori].selesai += 1

    if (item.estimasi_harga === null || item.estimasi_harga === '') {
      tanpaHarga += 1
      perKategori[kategori].tanpaHarga += 1
    } else {
      const harga = Number(item.estimasi_harga)
      estimasi += harga
      perKategori[kategori].estimasi += harga
    }
  }

  return {
    total,
    perStatus,
    estimasi,
    tanpaHarga,
    perKategori,
    persenSelesai: total === 0 ? 0 : Math.round((perStatus.selesai / total) * 100),
  }
}
