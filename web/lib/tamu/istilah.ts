import type { EstimasiKonsumsi } from './hitung'

// Kosakata estimasi tamu yang datang. Satu sumber untuk halaman Tamu, Dashboard,
// Bandingkan vendor, dan banner pengeluaran, supaya istilahnya selalu sama dan mudah
// dipahami orang awam. Nama teknis di kode (pasti, perkiraan, maksimum) tidak berubah.
// Satuannya "pax", yaitu jumlah orang, sama dengan satuan harga per pax di vendor.
export const ISTILAH_TAMU = {
  judul: 'Estimasi tamu yang datang',
  kegunaan: 'Dipakai untuk menentukan jumlah konsumsi.',
  pasti: {
    nama: 'Pasti Hadir',
  },
  mungkin: {
    nama: 'Rekomendasi Catering',
    keterangan: 'Estimasi paling aman untuk dipesan',
  },
  maksimal: {
    nama: 'Kapasitas Maksimal',
    keterangan: 'Jika semua undangan Pending ikut datang',
  },
  judulPenjelasan: 'Bagaimana angka ini dihitung?',
} as const

// Keterangan kartu Pasti Hadir. Menyebut jumlah undangan karena satu undangan
// bisa berisi beberapa pax, dan itu sering jadi sumber kebingungan.
export function keteranganPasti(e: EstimasiKonsumsi): string {
  return `Konfirmasi Hadir (dari ${e.undanganHadir} undangan)`
}

// Penjelasan cara hitung dalam dua paragraf pendek, memakai angka nyata dari data pengguna.
// Tujuannya menjawab pertanyaan "kenapa angka rekomendasi lebih besar dari yang pasti hadir".
export function paragrafCaraHitung(e: EstimasiKonsumsi): string[] {
  const { mungkin, maksimal } = ISTILAH_TAMU
  const pembuka =
    'Perhitungan memakai jumlah pax (orang), bukan jumlah undangan.'

  // Belum ada yang menjawab tegas, jadi pola kehadiran belum bisa dipelajari
  if (e.rasioKehadiran === null || e.perkiraan === null || e.tambahan === null) {
    return [
      `${pembuka} Belum ada undangan yang menjawab hadir atau tidak hadir, jadi angka "${mungkin.nama}" belum bisa dihitung.`,
      `Untuk sementara pakai angka "${maksimal.nama}" (${e.maksimum} pax), yaitu semua pax kecuali yang sudah menyatakan tidak hadir.`,
    ]
  }

  const persen = Math.round(e.rasioKehadiran * 100)
  const paragrafPertama = `${pembuka} Dari ${e.undanganMenjawab} undangan (total ${e.sudahMenjawab} pax) yang sudah menjawab, ${e.undanganHadir} undangan hadir dengan ${e.pasti} pax. Jadi tingkat kehadiran saat ini ${persen}%.`

  // Semua sudah menjawab, tidak ada yang perlu diperkirakan
  if (e.belumPasti === 0) {
    return [
      paragrafPertama,
      `Semua undangan sudah menjawab, jadi tidak ada yang perlu diperkirakan. Yang hadir ${e.pasti} pax.`,
    ]
  }

  return [
    paragrafPertama,
    `Angka ${persen}% itu dipakai untuk ${e.undanganBelumPasti} undangan (${e.belumPasti} pax) yang belum menjawab atau masih ragu, sehingga diperkirakan ${e.tambahan} pax akan hadir. Maka ${e.pasti} pax yang pasti hadir ditambah ${e.tambahan} pax perkiraan menjadi ${e.perkiraan} pax. Namanya juga perkiraan, jadi bisa meleset karena yang cepat membalas biasanya lebih antusias.`,
  ]
}
