import type { EstimasiKonsumsi } from '@/lib/tamu/hitung'
import { biayaDariVendor, hitungBiaya, modelDariVendor } from './hitung'
import type { Vendor } from './kueri'
import { NAMA_SATUAN } from './label'
import { tamuBawaan } from './skenario-tamu'

// Nominal isian awal untuk tawaran "catat pengeluaran" pada vendor yang sudah deal
// (Fase C). Dulu hanya harga tetap yang bisa diisi otomatis. Sekarang semua cara hitung
// dicoba, tetapi hanya bila jumlah yang dibutuhkan memang bisa ditentukan dengan jujur:
//   tetap          : tidak butuh jumlah.
//   per satuan     : butuh jumlah. Satuan tamu memakai estimasi tamu, satuan lain
//                    (jam, orang, buah) tidak punya sumber data, jadi dikosongkan.
//   paket tambahan : satuan tamu memakai estimasi tamu. Selain itu, atau bila estimasi
//                    belum ada, dipakai jumlah yang sudah termasuk di paket (tanpa tambahan).
// Hasil tetap hanya isian awal. Pengguna memeriksa dan mengubahnya di form pengeluaran.

export type Tawaran = {
  // Null bila nominal tidak bisa ditentukan dengan jujur
  nominal: number | null
  // Dasar perhitungan dalam satu kalimat, kosong untuk harga tetap tanpa jumlah
  asumsi: string | null
  // Hal yang perlu diperhatikan pengguna sebelum memakai nominal ini
  peringatan: string[]
  // Penjelasan mengapa nominal tidak diisi, hanya bila nominal null
  alasanKosong: string | null
}

function kosong(alasan: string): Tawaran {
  return { nominal: null, asumsi: null, peringatan: [], alasanKosong: alasan }
}

export function hitungTawaranNominal(
  v: Vendor,
  estimasi: EstimasiKonsumsi | null
): Tawaran {
  const model = modelDariVendor(v)
  const biaya = biayaDariVendor(v)
  const satuan = model.satuan ? NAMA_SATUAN[model.satuan] : null
  const bawaan = estimasi ? tamuBawaan(estimasi) : null
  const peringatan: string[] = []

  let jumlah: number | null = null
  let asumsi: string | null = null

  if (model.caraHitung === 'tetap') {
    // Harga tetap tidak bergantung jumlah, tetapi paket berbatas perlu diperingatkan
    // bila perkiraan tamu melebihi batasnya
    if (
      model.satuan === 'tamu' &&
      model.maksimumUnit !== null &&
      bawaan !== null &&
      bawaan.nilai > model.maksimumUnit
    ) {
      peringatan.push(
        `Perkiraan tamu (${bawaan.nilai} orang) melebihi batas paket ini (${model.maksimumUnit} tamu).`
      )
    }
  } else if (model.satuan === 'tamu' && bawaan !== null) {
    jumlah = bawaan.nilai
    asumsi = `Dihitung untuk ${jumlah} tamu (${bawaan.label.toLowerCase()}, dari halaman Tamu).`
  } else if (
    model.caraHitung === 'paket_tambahan' &&
    model.jumlahTermasuk !== null &&
    satuan !== null
  ) {
    jumlah = model.jumlahTermasuk
    asumsi = `Dihitung untuk jumlah yang sudah termasuk paket (${jumlah} ${satuan}), tanpa tambahan.`
  } else {
    return kosong(
      model.satuan === 'tamu'
        ? 'Total bergantung jumlah tamu, dan belum ada tamu di halaman Tamu sebagai dasar hitungan.'
        : `Total bergantung jumlah ${satuan ?? 'satuan'} yang belum pasti.`
    )
  }

  const hasil = hitungBiaya(model, biaya, jumlah)

  if (hasil.status === 'melebihi_maksimum') {
    return kosong(
      `Jumlah ${jumlah} ${satuan} melebihi batas ${model.maksimumUnit} ${satuan} milik vendor ini.`
    )
  }
  if (hasil.status !== 'ok' || hasil.total === null || hasil.total <= 0) {
    return kosong('Harga vendor belum lengkap, jadi totalnya belum bisa dihitung.')
  }

  return {
    nominal: hasil.total,
    asumsi,
    peringatan: [...peringatan, ...hasil.peringatan],
    alasanKosong: null,
  }
}
