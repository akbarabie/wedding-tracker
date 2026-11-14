// Panduan alur pendaftaran nikah (Modul 1). Isinya statis dan disusun dari referensi yang
// diberikan pemilik produk, bukan dari sumber resmi, jadi halaman panduan selalu mengingatkan
// untuk memastikan ke KUA atau Dinas setempat. Dipisah dari tampilan supaya mudah diperbarui.

export type Alur = {
  nomor: number
  judul: string
  langkah: string
  // Dokumen yang dibawa, sesuai urutan di referensi
  dokumen: string[]
  catatan?: string
}

export const DAFTAR_ALUR: readonly Alur[] = [
  {
    nomor: 1,
    judul: 'Minta Surat Pengantar RT/RW',
    langkah:
      'Datang ke RT untuk meminta Surat Pengantar Nikah, lalu ke RW untuk meminta tanda tangan.',
    dokumen: ['Fotocopy KTP', 'Fotocopy KK'],
    catatan: 'Datang ke RT/RW yang sesuai dengan alamat domisili di KTP.',
  },
  {
    nomor: 2,
    judul: 'Minta Formulir N1 di Kelurahan',
    langkah: 'Datang ke Kelurahan untuk minta dibuatkan formulir N1 - N4.',
    dokumen: [
      'Surat Pengantar RT/RW',
      'Fotocopy KTP dan KK',
      'Fotocopy Ijazah & Akte Kelahiran',
      'Pas Foto 3x4 (Latar Biru)',
      'Fotocopy KTP Orang Tua',
      'Fotocopy KTP Saksi',
      'Map Merah',
      'Materai 10.000 (1 Lembar)',
    ],
    catatan: 'Di Kelurahan akan mengisi Surat Pernyataan Belum Pernah Menikah.',
  },
  {
    nomor: 3,
    judul: 'Tes Kesehatan (Puskesmas)',
    langkah:
      'Datang ke Puskesmas untuk mengurus surat keterangan sehat, tes imunisasi/vaksin TT, dan sertifikat layak kawin.',
    dokumen: ['Fotocopy KTP'],
  },
  {
    nomor: 4,
    judul: 'Pendaftaran ke KUA',
    langkah:
      'Datang ke KUA sesuai domisili tempat akad akan dilaksanakan. Jika beda domisili, salah satu calon pengantin wajib mengurus Surat Rekomendasi Nikah dari KUA asal.',
    dokumen: [
      'Fotocopy KTP',
      'Fotocopy KK',
      'Fotocopy Akte Kelahiran',
      'Fotocopy Ijazah',
      'Surat Keterangan RT/RW',
      'Formulir N1 - N4',
      'Fotocopy KTP Orang Tua',
      'Fotocopy Buku Nikah Orang Tua',
      'Fotocopy KTP Saksi',
      'Surat Sehat / Sertifikat Layak Kawin',
      'Pas Foto 2x3 dan 4x6 (Latar Biru)',
      'Materai 10.000',
    ],
    catatan:
      'Melakukan pendaftaran online terlebih dahulu melalui website resmi Kemenag.',
  },
]

// Tautan pendaftaran online yang disebut pada catatan alur 4
export const TAUTAN_SIMKAH = 'https://simkah4.kemenag.go.id'

export const INFORMASI_TAMBAHAN = {
  biaya: [
    'Nikah di KUA (Hari & Jam Kerja): GRATIS (Rp 0)',
    'Nikah di Luar KUA / Luar Jam Kerja: Rp 600.000 (PP No. 59 Tahun 2018)',
  ],
  dokumenKhusus: [
    'Surat Izin Orang Tua (jika pengantin berusia < 21 tahun)',
    'Surat Keterangan Kematian (jika pengantin cerai mati)',
    'Akta Cerai Asli (jika pengantin cerai hidup)',
  ],
  catatanUmum:
    'Persyaratan dapat sedikit bervariasi tergantung kebijakan KUA/Dinas setempat.',
}
