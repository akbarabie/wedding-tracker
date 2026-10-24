import {
  DAFTAR_KATEGORI_TAMU,
  DAFTAR_STATUS_RSVP,
  type KategoriTamu,
  type StatusRsvp,
} from './label'

// Satu baris dari view ringkasan_tamu (dikelompokkan per kategori dan status)
export type BarisRingkasanTamu = {
  kategori: string
  status_rsvp: string
  jumlah_undangan: number | string
  jumlah_orang: number | string
}

type Hitungan = { undangan: number; orang: number }

export type RingkasanTamu = {
  undangan: number
  orang: number
  perStatus: Record<StatusRsvp, Hitungan>
  perKategori: Record<KategoriTamu, Hitungan>
}

function kosong<K extends string>(kunci: readonly K[]): Record<K, Hitungan> {
  return Object.fromEntries(
    kunci.map((k) => [k, { undangan: 0, orang: 0 }])
  ) as Record<K, Hitungan>
}

// Menjumlahkan baris view menjadi total, per status, dan per kategori.
// Satu undangan bisa dihadiri beberapa orang, jadi "undangan" menghitung baris tamu
// dan "orang" menjumlahkan jumlah_orang. Konsumsi dihitung dari orang, bukan undangan.
// Baris dengan kategori atau status tak dikenal dilewati supaya data aneh tidak
// merusak ringkasan (database sebenarnya sudah membatasi nilainya).
export function ringkasTamu(baris: BarisRingkasanTamu[]): RingkasanTamu {
  const hasil: RingkasanTamu = {
    undangan: 0,
    orang: 0,
    perStatus: kosong(DAFTAR_STATUS_RSVP),
    perKategori: kosong(DAFTAR_KATEGORI_TAMU),
  }

  for (const b of baris) {
    const status = b.status_rsvp as StatusRsvp
    const kategori = b.kategori as KategoriTamu
    if (!(status in hasil.perStatus) || !(kategori in hasil.perKategori)) continue

    // PostgREST bisa mengirim bigint sebagai teks, jadi diubah ke angka dulu
    const undangan = Number(b.jumlah_undangan)
    const orang = Number(b.jumlah_orang)

    hasil.undangan += undangan
    hasil.orang += orang
    hasil.perStatus[status].undangan += undangan
    hasil.perStatus[status].orang += orang
    hasil.perKategori[kategori].undangan += undangan
    hasil.perKategori[kategori].orang += orang
  }

  return hasil
}

export type EstimasiKonsumsi = {
  // Orang yang sudah pasti hadir, dasar paling aman untuk memesan konsumsi
  pasti: number
  // Batas atas bila semua yang masih ragu atau belum menjawab ternyata datang
  maksimum: number
  // Rasio hadir dibanding yang sudah menjawab (hadir dan tidak hadir), 0 sampai 1.
  // Null bila belum ada satu pun yang menjawab tegas.
  rasioKehadiran: number | null
  // Perkiraan realistis: yang pasti hadir ditambah sisa yang belum pasti dikali rasio.
  // Dibulatkan ke atas supaya konsumsi tidak kurang. Null bila rasio belum bisa dihitung.
  perkiraan: number | null
}

// Estimasi jumlah konsumsi (PRD 6.4). Jumlah kehadiran aktual biasanya jauh di bawah
// total undangan, jadi selain batas bawah dan atas dihitung juga perkiraan memakai
// pola dari tamu yang sudah menjawab. Keterbatasan: yang cepat menjawab cenderung
// lebih antusias, jadi di awal rasionya bisa terlalu tinggi dan perlu dibaca sebagai
// perkiraan, bukan angka pasti.
export function estimasiKonsumsi(ringkasan: RingkasanTamu): EstimasiKonsumsi {
  const hadir = ringkasan.perStatus.hadir.orang
  const tidakHadir = ringkasan.perStatus.tidak_hadir.orang
  const belumPasti =
    ringkasan.perStatus.ragu.orang + ringkasan.perStatus.belum_konfirmasi.orang

  const maksimum = hadir + belumPasti
  const sudahMenjawab = hadir + tidakHadir
  const rasioKehadiran = sudahMenjawab > 0 ? hadir / sudahMenjawab : null

  const perkiraan =
    rasioKehadiran === null
      ? null
      : Math.min(maksimum, hadir + Math.ceil(belumPasti * rasioKehadiran))

  return { pasti: hadir, maksimum, rasioKehadiran, perkiraan }
}
