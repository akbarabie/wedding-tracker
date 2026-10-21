import type { Vendor } from './kueri'
import {
  NAMA_SATUAN,
  type JenisBiaya,
  type ModelHarga,
  type Satuan,
} from './label'

// Mesin penghitung biaya vendor. Semua fungsi di sini murni (tanpa database dan tanpa
// efek samping) supaya mudah diuji. Rumusnya:
//   total = (harga dasar + unit tambahan x tarif + biaya wajib - potongan wajib)
//           x (1 + pajak bila belum termasuk)
// Pajak dan biaya lainnya sengaja dipisah: pajak berupa persen dari seluruh tagihan,
// sedangkan biaya lainnya berupa nominal (listrik, keamanan, transport, dan sejenisnya).

export type BiayaTambahan = {
  nama: string
  jenis: JenisBiaya
  // Harga satu kali, banyaknya ada di jumlah. Kosong bila tarifnya belum diketahui,
  // misalnya catatan vendor yang hanya menulis "kena charge" tanpa nominal.
  nominal: number | null
  jumlah: number
  satuanLabel: string | null
  wajib: boolean
}

export type StatusHitung =
  | 'ok'
  | 'harga_kosong'
  | 'butuh_jumlah'
  | 'melebihi_maksimum'

export type HasilHitung = {
  status: StatusHitung
  // Null bila harga belum lengkap atau jumlah belum diisi
  total: number | null
  // Total bila seluruh biaya opsional ikut diambil
  totalDenganOpsional: number | null
  // Harga efektif per satuan untuk jumlah yang dimasukkan
  hargaPerSatuan: number | null
  rincian: { label: string; nilai: number }[]
  peringatan: string[]
  // Berapa satuan yang melebihi batas maksimal, nol bila tidak melebihi
  kelebihan: number
  biayaWajib: number
  potonganWajib: number
  // Ada biaya atau potongan opsional (bersyarat) yang nominalnya diketahui
  adaOpsional: boolean
  pajak: number
}

function kosong(status: StatusHitung): HasilHitung {
  return {
    status,
    total: null,
    totalDenganOpsional: null,
    hargaPerSatuan: null,
    rincian: [],
    peringatan: [],
    kelebihan: 0,
    biayaWajib: 0,
    potonganWajib: 0,
    adaOpsional: false,
    pajak: 0,
  }
}

// Menjumlah nominal x jumlah untuk satu jenis dan satu status wajib. Baris yang
// nominalnya belum diketahui tidak ikut dijumlah, dan dilaporkan terpisah.
function jumlahBiaya(
  biaya: BiayaTambahan[],
  jenis: JenisBiaya,
  wajib: boolean
): number {
  return biaya
    .filter((b) => b.jenis === jenis && b.wajib === wajib)
    .reduce((t, b) => t + (b.nominal ?? 0) * b.jumlah, 0)
}

// Menghitung total biaya satu vendor untuk satu skenario. jumlah adalah banyaknya
// satuan yang dibutuhkan (misalnya 300 tamu), diabaikan bila vendor tidak punya satuan.
export function hitungBiaya(
  model: ModelHarga,
  biaya: BiayaTambahan[],
  jumlah: number | null
): HasilHitung {
  const satuan = model.satuan ? NAMA_SATUAN[model.satuan] : ''
  const n = model.satuan && jumlah !== null && jumlah > 0 ? jumlah : null

  const rincian: { label: string; nilai: number }[] = []
  const peringatan: string[] = []
  let dasar: number

  if (model.caraHitung === 'tetap') {
    if (model.hargaDasar === null) return kosong('harga_kosong')
    dasar = model.hargaDasar
    rincian.push({ label: 'Harga tetap', nilai: dasar })
  } else if (model.caraHitung === 'per_satuan') {
    if (model.tarifPerSatuan === null) return kosong('harga_kosong')
    if (n === null) return kosong('butuh_jumlah')
    const ditagih = Math.max(n, model.minimumUnit ?? 0)
    if (model.minimumUnit !== null && n < model.minimumUnit) {
      peringatan.push(
        `Di bawah minimum ${model.minimumUnit} ${satuan}, ditagih sebesar minimum`
      )
    }
    dasar = ditagih * model.tarifPerSatuan
    rincian.push({
      label: `${ditagih} ${satuan} x tarif per ${satuan}`,
      nilai: dasar,
    })
  } else {
    if (
      model.hargaDasar === null ||
      model.tarifPerSatuan === null ||
      model.jumlahTermasuk === null
    ) {
      return kosong('harga_kosong')
    }
    if (n === null) return kosong('butuh_jumlah')
    const tambahan = Math.max(0, n - model.jumlahTermasuk)
    rincian.push({
      label: `Paket sudah termasuk ${model.jumlahTermasuk} ${satuan}`,
      nilai: model.hargaDasar,
    })
    if (tambahan > 0) {
      rincian.push({
        label: `Tambahan ${tambahan} ${satuan} x tarif per ${satuan}`,
        nilai: tambahan * model.tarifPerSatuan,
      })
    } else if (n < model.jumlahTermasuk) {
      // Paket dibayar utuh, tidak dihitung ulang secara proporsional
      peringatan.push(
        `Paket dibayar utuh walau jumlah kurang dari ${model.jumlahTermasuk} ${satuan}`
      )
    }
    dasar = model.hargaDasar + tambahan * model.tarifPerSatuan
  }

  const wajibBiaya = jumlahBiaya(biaya, 'biaya', true)
  const wajibPotongan = jumlahBiaya(biaya, 'potongan', true)
  const opsionalBiaya = jumlahBiaya(biaya, 'biaya', false)
  const opsionalPotongan = jumlahBiaya(biaya, 'potongan', false)

  if (wajibBiaya > 0) rincian.push({ label: 'Biaya lainnya wajib', nilai: wajibBiaya })
  if (wajibPotongan > 0) {
    rincian.push({ label: 'Potongan', nilai: -wajibPotongan })
  }

  // Biaya wajib yang nominalnya belum diketahui membuat total belum lengkap
  const wajibTanpaNominal = biaya
    .filter((b) => b.jenis === 'biaya' && b.wajib && b.nominal === null)
    .map((b) => b.nama)
  if (wajibTanpaNominal.length > 0) {
    peringatan.push(
      `Biaya wajib belum ada nominalnya (${wajibTanpaNominal.join(', ')}), total belum lengkap`
    )
  }

  // Satu persen pajak berlaku untuk seluruh tagihan vendor bila harganya belum termasuk pajak
  const faktorPajak =
    !model.pajakTermasuk && model.pajakPersen > 0 ? model.pajakPersen / 100 : 0
  const sebelumPajak = dasar + wajibBiaya - wajibPotongan
  // Potongan tidak boleh membuat tagihan menjadi negatif
  const subtotal = Math.max(0, sebelumPajak)
  const pajak = Math.round(subtotal * faktorPajak)
  if (pajak > 0) {
    rincian.push({ label: `Pajak ${model.pajakPersen}%`, nilai: pajak })
  }

  const total = Math.round(subtotal) + pajak
  const totalDenganOpsional = Math.round(
    Math.max(0, sebelumPajak + opsionalBiaya - opsionalPotongan) * (1 + faktorPajak)
  )

  const melebihi =
    model.satuan !== null &&
    model.maksimumUnit !== null &&
    n !== null &&
    n > model.maksimumUnit

  return {
    status: melebihi ? 'melebihi_maksimum' : 'ok',
    total,
    totalDenganOpsional,
    hargaPerSatuan: n !== null ? Math.round(total / n) : null,
    rincian,
    peringatan,
    kelebihan: melebihi && n !== null ? n - (model.maksimumUnit as number) : 0,
    biayaWajib: wajibBiaya,
    potonganWajib: wajibPotongan,
    adaOpsional: opsionalBiaya > 0 || opsionalPotongan > 0,
    pajak,
  }
}

// ---------- Titik impas ----------

export type KandidatHitung = {
  nama: string
  model: ModelHarga
  biaya: BiayaTambahan[]
}

// Batas atas pencarian per satuan, supaya perulangan tetap ringan dan masuk akal
const PLAFON: Record<Satuan, number> = {
  tamu: 2000,
  jam: 24,
  orang: 50,
  buah: 5000,
}

export type RentangImpas = {
  satuan: Satuan
  batasBawah: number
  batasAtas: number
  // Rentang jumlah di mana paketan lebih murah dari vendor per satuan
  paketanLebihHemat: [number, number][]
}

// Membandingkan satu paketan (harga tetap dengan satuan, atau paket ditambah per satuan)
// dengan satu vendor yang dihitung per satuan, pada satuan yang sama. Seluruh komponen
// (tambahan, biaya wajib, pajak) ikut dihitung lewat hitungBiaya, jadi hasilnya jujur.
// Hasil null berarti pasangan ini tidak bisa dibandingkan.
export function cariRentangImpas(
  paketan: KandidatHitung,
  perSatuan: KandidatHitung
): RentangImpas | null {
  const a = paketan.model
  const b = perSatuan.model
  if (b.caraHitung !== 'per_satuan' || a.caraHitung === 'per_satuan') return null
  if (a.satuan === null || a.satuan !== b.satuan) return null
  if (a.caraHitung === 'tetap' && a.maksimumUnit === null) return null

  const satuan = a.satuan
  const batasAtas = Math.min(
    PLAFON[satuan],
    a.maksimumUnit ?? Infinity,
    b.maksimumUnit ?? Infinity
  )
  const batasBawah = 1
  const rentang: [number, number][] = []
  let mulai: number | null = null

  for (let n = batasBawah; n <= batasAtas; n++) {
    const ha = hitungBiaya(a, paketan.biaya, n)
    const hb = hitungBiaya(b, perSatuan.biaya, n)
    if (ha.total === null || hb.total === null) return null
    const paketanHemat = ha.total < hb.total
    if (paketanHemat && mulai === null) mulai = n
    if (!paketanHemat && mulai !== null) {
      rentang.push([mulai, n - 1])
      mulai = null
    }
  }
  if (mulai !== null) rentang.push([mulai, batasAtas])

  return { satuan, batasBawah, batasAtas, paketanLebihHemat: rentang }
}

export function kalimatImpas(
  namaPaketan: string,
  namaPerSatuan: string,
  hasil: RentangImpas
): string {
  const s = NAMA_SATUAN[hasil.satuan]
  const { batasBawah, batasAtas, paketanLebihHemat: r } = hasil

  if (r.length === 0) {
    return `${namaPaketan} tidak pernah lebih hemat dari ${namaPerSatuan} pada ${batasBawah} sampai ${batasAtas} ${s}.`
  }
  if (r.length === 1 && r[0][0] === batasBawah && r[0][1] === batasAtas) {
    return `${namaPaketan} lebih hemat dari ${namaPerSatuan} pada seluruh jumlah, ${batasBawah} sampai ${batasAtas} ${s}.`
  }
  const teksRentang = r
    .map(([x, y]) => (x === y ? `tepat ${x} ${s}` : `${x} sampai ${y} ${s}`))
    .join(', ')
  return `${namaPaketan} lebih hemat dari ${namaPerSatuan} pada ${teksRentang}. Di luar itu, ${namaPerSatuan} lebih murah atau sama.`
}

// ---------- Pemetaan dari baris database ----------

export function modelDariVendor(v: Vendor): ModelHarga {
  return {
    caraHitung: v.cara_hitung,
    satuan: v.satuan,
    hargaDasar: v.harga_dasar,
    jumlahTermasuk: v.jumlah_termasuk,
    tarifPerSatuan: v.tarif_per_satuan,
    minimumUnit: v.minimum_unit,
    maksimumUnit: v.maksimum_unit,
    pajakPersen: v.pajak_persen,
    pajakTermasuk: v.pajak_termasuk,
  }
}

export function biayaDariVendor(v: Vendor): BiayaTambahan[] {
  return (v.vendor_biaya ?? []).map((b) => ({
    nama: b.nama,
    jenis: b.jenis,
    nominal: b.nominal,
    jumlah: b.jumlah,
    satuanLabel: b.satuan_label,
    wajib: b.wajib,
  }))
}
