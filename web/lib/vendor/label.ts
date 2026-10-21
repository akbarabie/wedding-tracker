import { formatRupiah } from '@/lib/format'

// ---------- Status vendor ----------

// Urutan di sini adalah urutan alur negosiasi, dipakai juga untuk urutan pilihan di form
export const LABEL_STATUS_VENDOR = {
  disurvei: 'Sedang disurvei',
  dihubungi: 'Sudah dihubungi',
  negosiasi: 'Negosiasi',
  deal: 'Deal',
  ditolak: 'Ditolak',
} as const

export type StatusVendor = keyof typeof LABEL_STATUS_VENDOR

export const DAFTAR_STATUS_VENDOR = Object.keys(
  LABEL_STATUS_VENDOR
) as StatusVendor[]

// ---------- Biaya lainnya ----------

// Biaya menambah total, potongan (diskon atau cashback) mengurangi total
export const LABEL_JENIS_BIAYA = {
  biaya: 'Biaya tambahan',
  potongan: 'Potongan atau cashback',
} as const

export type JenisBiaya = keyof typeof LABEL_JENIS_BIAYA

export const DAFTAR_JENIS_BIAYA = Object.keys(LABEL_JENIS_BIAYA) as JenisBiaya[]

// Teks nominal satu baris biaya, dipakai di halaman detail dan perbandingan.
// Contoh: "Rp 500.000 x 2 jam", "-Rp 500.000" (potongan), atau "Nominal belum diketahui".
export function ringkasBiaya(b: {
  jenis: JenisBiaya
  nominal: number | null
  jumlah: number
  satuanLabel: string | null
}): string {
  if (b.nominal === null) return 'Nominal belum diketahui'
  const nilai = `${b.jenis === 'potongan' ? '-' : ''}${formatRupiah(b.nominal)}`
  if (b.jumlah > 1) return `${nilai} x ${b.jumlah}${b.satuanLabel ? ` ${b.satuanLabel}` : ''}`
  return b.satuanLabel ? `${nilai} per ${b.satuanLabel}` : nilai
}

// Batas panjang nama satu baris biaya, sama dengan batas di validasi dan database
export const BATAS_NAMA_BIAYA = 120

// Menambahkan satu saran di samping nama yang sudah ada, dipisah koma. Koma atau spasi
// sisa di ujung nama dirapikan dulu. Saran yang sudah ada tidak digandakan.
export function gabungNamaBiaya(sekarang: string, saran: string): string {
  const bersih = sekarang.trim().replace(/[,\s]+$/, '')
  if (bersih === '') return saran
  const sudahAda = bersih
    .split(',')
    .map((bagian) => bagian.trim().toLowerCase())
    .includes(saran.toLowerCase())
  return sudahAda ? sekarang : `${bersih}, ${saran}`
}

// Saran nama biaya agar pengguna tidak mengetik dari nol. Kelompok hanya penanda
// kebiasaan umum, bukan terikat pada nama kategori karena kategori bebas diberi nama.
export const SARAN_BIAYA = [
  {
    kelompok: 'Gedung atau venue',
    nama: [
      'Listrik tambahan',
      'AC tambahan',
      'Keamanan',
      'Air',
      'Kebersihan',
      'Parkir dan valet',
      'Genset',
      'Sound system',
      'Lighting',
      'Jam tambahan (overtime)',
      'Biaya vendor luar',
    ],
  },
  {
    kelompok: 'Band dan hiburan',
    nama: [
      'Sound system dan lighting',
      'Transport kru',
      'Akomodasi kru',
      'Personel tambahan',
      'Alat musik tambahan',
      'Charge penambahan waktu',
      'Setup dan sound check',
    ],
  },
  {
    kelompok: 'Umum',
    nama: ['Transport', 'Charge luar kota', 'Akomodasi', 'Biaya administrasi', 'Lembur'],
  },
] as const

// ---------- Model harga ----------

// Cara vendor menetapkan harga. Hampir semua vendor cocok dengan salah satunya.
export const LABEL_CARA_HITUNG = {
  tetap: 'Harga tetap',
  per_satuan: 'Dihitung per satuan',
  paket_tambahan: 'Paket ditambah per satuan',
} as const

export type CaraHitung = keyof typeof LABEL_CARA_HITUNG

export const DAFTAR_CARA_HITUNG = Object.keys(LABEL_CARA_HITUNG) as CaraHitung[]

// Satuan yang dihitung vendor: tamu (pax), jam, orang, atau buah
export const NAMA_SATUAN = {
  tamu: 'tamu',
  jam: 'jam',
  orang: 'orang',
  buah: 'buah',
} as const

export type Satuan = keyof typeof NAMA_SATUAN

export const DAFTAR_SATUAN = Object.keys(NAMA_SATUAN) as Satuan[]

// Teks pilihan satuan di form vendor
export const LABEL_PILIHAN_SATUAN: Record<Satuan, string> = {
  tamu: 'Tamu (pax)',
  jam: 'Jam',
  orang: 'Orang',
  buah: 'Buah',
}

// Label kolom skenario di halaman perbandingan
export const LABEL_INPUT_SATUAN: Record<Satuan, string> = {
  tamu: 'Jumlah tamu (pax)',
  jam: 'Durasi (jam)',
  orang: 'Jumlah orang',
  buah: 'Jumlah buah',
}

// Susunan harga satu vendor, dipakai oleh mesin penghitung dan ringkasan
export type ModelHarga = {
  caraHitung: CaraHitung
  satuan: Satuan | null
  hargaDasar: number | null
  jumlahTermasuk: number | null
  tarifPerSatuan: number | null
  minimumUnit: number | null
  maksimumUnit: number | null
  pajakPersen: number
  pajakTermasuk: boolean
}

// Ringkasan satu baris, misalnya "Rp 150.000 per tamu" atau
// "Rp 43.020.000 untuk 180 tamu, tambahan Rp 139.000 per tamu"
export function ringkasHarga(m: ModelHarga): string {
  const satuan = m.satuan ? NAMA_SATUAN[m.satuan] : ''
  let teks: string

  if (m.caraHitung === 'tetap') {
    if (m.hargaDasar === null) return 'Harga belum diisi'
    teks =
      m.satuan && m.maksimumUnit !== null
        ? `${formatRupiah(m.hargaDasar)} untuk maksimal ${m.maksimumUnit} ${satuan}`
        : `${formatRupiah(m.hargaDasar)} (harga tetap)`
  } else if (m.caraHitung === 'per_satuan') {
    if (m.tarifPerSatuan === null) return 'Harga belum diisi'
    teks = `${formatRupiah(m.tarifPerSatuan)} per ${satuan}`
    if (m.minimumUnit !== null) teks += `, minimum ${m.minimumUnit} ${satuan}`
  } else {
    if (m.hargaDasar === null) return 'Harga belum diisi'
    teks = `${formatRupiah(m.hargaDasar)} untuk ${m.jumlahTermasuk} ${satuan}`
    if (m.tarifPerSatuan !== null) {
      teks += `, tambahan ${formatRupiah(m.tarifPerSatuan)} per ${satuan}`
    }
  }

  if (!m.pajakTermasuk && m.pajakPersen > 0) {
    teks += `, belum termasuk pajak ${m.pajakPersen}%`
  }
  return teks
}
