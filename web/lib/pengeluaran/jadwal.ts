export type JenisPembayaran = 'dp' | 'cicilan' | 'pelunasan'

export type BarisJadwal = {
  jenis: JenisPembayaran
  label: string
  nominal: number
  jatuh_tempo: string
  dibayar_pada: string | null
}

export type PermintaanJadwal =
  | { jenis: 'dp'; nominalDp: number; jatuhTempo: string; dibayarPada: string | null }
  | { jenis: 'cicilan'; jumlahCicilan: number; jatuhTempo: string }
  | { jenis: 'pelunasan'; jatuhTempo: string; dibayarPada: string | null }

// Keadaan pembayaran pengeluaran saat permintaan dibuat
export type KeadaanPembayaran = {
  belumDijadwalkan: number
  adaDp: boolean
  adaPelunasan: boolean
  jumlahCicilan: number
}

export type HasilJadwal = { baris: BarisJadwal[] } | { galat: string }

// Menambah bulan pada tanggal YYYY-MM-DD. Hari dijepit ke akhir bulan tujuan,
// jadi 31 Januari ditambah satu bulan menjadi 28 atau 29 Februari.
// Selalu dihitung dari tanggal awal supaya hari tidak bergeser berantai.
export function tambahBulan(tanggal: string, bulan: number): string {
  const [tahunAwal, bulanAwal, hariAwal] = tanggal.split('-').map(Number)
  const indeks = bulanAwal - 1 + bulan
  const tahun = tahunAwal + Math.floor(indeks / 12)
  const bulanBaru = ((indeks % 12) + 12) % 12
  const hariTerakhir = new Date(Date.UTC(tahun, bulanBaru + 1, 0)).getUTCDate()
  const hari = Math.min(hariAwal, hariTerakhir)

  return [
    String(tahun).padStart(4, '0'),
    String(bulanBaru + 1).padStart(2, '0'),
    String(hari).padStart(2, '0'),
  ].join('-')
}

// Menyusun baris pembayaran dari permintaan pengguna.
// Hanya menghitung dan memvalidasi aturan, tidak menyentuh database.
export function susunJadwal(
  permintaan: PermintaanJadwal,
  keadaan: KeadaanPembayaran
): HasilJadwal {
  const sisa = keadaan.belumDijadwalkan

  if (sisa <= 0) {
    return {
      galat:
        'Seluruh nominal sudah terjadwal. Hapus salah satu pembayaran bila ingin menyusun ulang.',
    }
  }

  if (permintaan.jenis === 'dp') {
    if (keadaan.adaDp) return { galat: 'DP untuk pengeluaran ini sudah ada.' }
    if (permintaan.nominalDp >= sisa) {
      return {
        galat:
          'Nominal DP harus lebih kecil dari sisa yang belum dijadwalkan. Gunakan Pelunasan untuk membayar sisanya sekaligus.',
      }
    }
    return {
      baris: [
        {
          jenis: 'dp',
          label: 'DP',
          nominal: permintaan.nominalDp,
          jatuh_tempo: permintaan.jatuhTempo,
          dibayar_pada: permintaan.dibayarPada,
        },
      ],
    }
  }

  if (permintaan.jenis === 'pelunasan') {
    if (keadaan.adaPelunasan) {
      return { galat: 'Pelunasan untuk pengeluaran ini sudah ada.' }
    }
    return {
      baris: [
        {
          jenis: 'pelunasan',
          label: 'Pelunasan',
          nominal: sisa,
          jatuh_tempo: permintaan.jatuhTempo,
          dibayar_pada: permintaan.dibayarPada,
        },
      ],
    }
  }

  // Cicilan: sisa dibagi rata, selisih pembulatan masuk ke pembayaran terakhir
  const jumlah = permintaan.jumlahCicilan
  if (sisa < jumlah) {
    return { galat: 'Sisa nominal terlalu kecil untuk dibagi sebanyak itu.' }
  }

  const perCicilan = Math.floor(sisa / jumlah)
  const baris: BarisJadwal[] = []

  for (let i = 0; i < jumlah; i++) {
    const terakhir = i === jumlah - 1
    // Pembayaran terakhir menjadi Pelunasan, kecuali pelunasan sudah ada
    // (misalnya sebagian cicilan dihapus lalu disusun ulang).
    const jadiPelunasan = terakhir && !keadaan.adaPelunasan

    baris.push({
      jenis: jadiPelunasan ? 'pelunasan' : 'cicilan',
      label: jadiPelunasan
        ? 'Pelunasan'
        : `Cicilan ${keadaan.jumlahCicilan + i + 1}`,
      nominal: terakhir ? sisa - perCicilan * (jumlah - 1) : perCicilan,
      jatuh_tempo: tambahBulan(permintaan.jatuhTempo, i),
      dibayar_pada: null,
    })
  }

  return { baris }
}