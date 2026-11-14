import {
  DAFTAR_JENIS_UNDANGAN,
  DAFTAR_KATEGORI_TAMU,
  DAFTAR_PIHAK,
  DAFTAR_STATUS_RSVP,
  type JenisUndangan,
  type KategoriTamu,
  type Pihak,
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
  // Bahan untuk menjelaskan cara hitung kepada pengguna
  // Orang yang sudah menjawab tegas (hadir atau tidak hadir)
  sudahMenjawab: number
  // Orang yang masih ragu atau belum menjawab
  belumPasti: number
  // Dari yang belum pasti, berapa yang dianggap datang. Null bila perkiraan belum bisa dihitung.
  tambahan: number | null
  // Jumlah undangan (baris tamu), dipakai untuk menjelaskan angka dalam bahasa sehari-hari
  undanganHadir: number
  undanganMenjawab: number
  undanganBelumPasti: number
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

  return {
    pasti: hadir,
    maksimum,
    rasioKehadiran,
    perkiraan,
    sudahMenjawab,
    belumPasti,
    tambahan: perkiraan === null ? null : perkiraan - hadir,
    undanganHadir: ringkasan.perStatus.hadir.undangan,
    undanganMenjawab:
      ringkasan.perStatus.hadir.undangan + ringkasan.perStatus.tidak_hadir.undangan,
    undanganBelumPasti:
      ringkasan.perStatus.ragu.undangan + ringkasan.perStatus.belum_konfirmasi.undangan,
  }
}

// Satu baris dari view ringkasan_undangan_tamu (dikelompokkan per pihak dan jenis undangan)
export type BarisRingkasanUndangan = {
  pihak: string | null
  jenis_undangan: string | null
  jumlah_undangan: number | string
  jumlah_orang: number | string
}

// "belum" berarti kolomnya masih kosong, yaitu tamu lama yang belum dilengkapi
export type KunciPihak = Pihak | 'belum'
export type KunciJenis = JenisUndangan | 'belum'

export type RingkasanUndangan = {
  perPihak: Record<KunciPihak, Hitungan>
  perJenis: Record<KunciJenis, Hitungan>
  // Satu baris tamu dihitung satu lembar undangan cetak, berapa pun jumlah orangnya
  perluDicetak: number
  // Undangan yang dikirim lewat tautan digital
  kirimDigital: number
}

// Menjumlahkan baris view menjadi kuota per pihak, jumlah per jenis undangan, serta
// berapa lembar yang perlu dicetak dan berapa yang dikirim digital.
export function ringkasUndangan(baris: BarisRingkasanUndangan[]): RingkasanUndangan {
  const perPihak = kosong([...DAFTAR_PIHAK, 'belum'] as const)
  const perJenis = kosong([...DAFTAR_JENIS_UNDANGAN, 'belum'] as const)

  for (const b of baris) {
    const kunciPihak = (b.pihak ?? 'belum') as KunciPihak
    const kunciJenis = (b.jenis_undangan ?? 'belum') as KunciJenis
    if (!(kunciPihak in perPihak) || !(kunciJenis in perJenis)) continue

    const undangan = Number(b.jumlah_undangan)
    const orang = Number(b.jumlah_orang)
    perPihak[kunciPihak].undangan += undangan
    perPihak[kunciPihak].orang += orang
    perJenis[kunciJenis].undangan += undangan
    perJenis[kunciJenis].orang += orang
  }

  return {
    perPihak,
    perJenis,
    perluDicetak: perJenis.cetak.undangan + perJenis.cetak_digital.undangan,
    kirimDigital: perJenis.digital.undangan + perJenis.cetak_digital.undangan,
  }
}
