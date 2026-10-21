import { z } from 'zod'
import {
  DAFTAR_CARA_HITUNG,
  DAFTAR_JENIS_BIAYA,
  DAFTAR_SATUAN,
  DAFTAR_STATUS_VENDOR,
  BATAS_NAMA_BIAYA,
} from '@/lib/vendor/label'

// Teks yang boleh kosong, kosong disimpan sebagai null
const teksOpsional = (maks: number, pesan: string) =>
  z
    .string()
    .trim()
    .max(maks, pesan)
    .transform((v) => (v === '' ? null : v))

// Angka bulat yang boleh kosong. Kolom rupiah dan kolom angka sudah mengirim angka murni.
const angkaOpsional = (maksDigit: number, pesan: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || new RegExp(`^\\d{1,${maksDigit}}$`).test(v), pesan)
    .transform((v) => (v === '' ? null : Number(v)))

// Angka bulat positif yang boleh kosong, untuk jumlah dan batas
const jumlahOpsional = (pesan: string) =>
  angkaOpsional(6, pesan).refine((v) => v === null || v > 0, 'Harus lebih dari 0')

const satuanOpsional = z
  .string()
  .trim()
  .refine((v) => v === '' || (DAFTAR_SATUAN as string[]).includes(v), 'Pilih satuan')
  .transform((v) => (v === '' ? null : (v as (typeof DAFTAR_SATUAN)[number])))

const dasarVendor = z.object({
  nama: z
    .string()
    .trim()
    .min(1, 'Nama vendor wajib diisi')
    .max(120, 'Nama vendor maksimal 120 karakter'),
  kategoriId: z.uuid('Pilih kategori'),
  lokasi: teksOpsional(120, 'Lokasi maksimal 120 karakter'),
  caraHitung: z.enum(DAFTAR_CARA_HITUNG, { error: 'Pilih cara menghitung harga' }),
  satuan: satuanOpsional,
  // Harga batas 12 digit mengikuti kolom numeric(14,2)
  hargaDasar: angkaOpsional(12, 'Harga hanya boleh berisi angka, maksimal 12 digit'),
  jumlahTermasuk: jumlahOpsional('Hanya boleh berisi angka'),
  tarifPerSatuan: angkaOpsional(12, 'Tarif hanya boleh berisi angka, maksimal 12 digit'),
  minimumUnit: jumlahOpsional('Hanya boleh berisi angka'),
  maksimumUnit: jumlahOpsional('Hanya boleh berisi angka'),
  pajak: z.enum(['termasuk', 'belum'], { error: 'Pilih keterangan pajak' }),
  pajakPersen: angkaOpsional(3, 'Hanya boleh berisi angka').refine(
    (v) => v === null || v <= 100,
    'Maksimal 100 persen'
  ),
  kontak: teksOpsional(200, 'Kontak maksimal 200 karakter'),
  catatanSurvei: teksOpsional(2000, 'Catatan maksimal 2000 karakter'),
  status: z.enum(DAFTAR_STATUS_VENDOR, { error: 'Pilih status' }),
})

type DataMentah = z.output<typeof dasarVendor>

// Bentuk data yang siap disimpan: pilihan pajak diubah menjadi persen dan penanda termasuk
export type DataVendor = Omit<DataMentah, 'pajak'> & { pajakTermasuk: boolean }

// Aturan keterkaitan antar kolom. Aturan yang sama dijaga di database lewat constraint.
function periksaKeterkaitan(d: DataMentah, ctx: z.RefinementCtx) {
  const tambah = (path: string, message: string) =>
    ctx.addIssue({ code: 'custom', message, path: [path] })

  if (d.caraHitung !== 'tetap' && d.satuan === null) {
    tambah('satuan', 'Pilih satuan yang dihitung vendor')
  }
  if (d.caraHitung === 'tetap' && d.maksimumUnit !== null && d.satuan === null) {
    tambah('satuan', 'Pilih satuan untuk batas jumlah')
  }
  if (d.caraHitung === 'paket_tambahan' && d.jumlahTermasuk === null) {
    tambah('jumlahTermasuk', 'Isi jumlah yang sudah termasuk dalam paket')
  }
  if (
    d.caraHitung === 'per_satuan' &&
    d.minimumUnit !== null &&
    d.maksimumUnit !== null &&
    d.minimumUnit > d.maksimumUnit
  ) {
    tambah('minimumUnit', 'Minimum tidak boleh melebihi maksimum')
  }
  if (
    d.caraHitung === 'paket_tambahan' &&
    d.jumlahTermasuk !== null &&
    d.maksimumUnit !== null &&
    d.jumlahTermasuk > d.maksimumUnit
  ) {
    tambah('jumlahTermasuk', 'Tidak boleh melebihi batas maksimal')
  }
  if (d.pajak === 'belum' && (d.pajakPersen === null || d.pajakPersen === 0)) {
    tambah('pajakPersen', 'Isi persen pajak yang belum termasuk')
  }
}

// Mengosongkan kolom yang tidak berlaku untuk cara hitung terpilih, supaya data yang
// tersimpan selalu konsisten walau form mengirim sisa isian dari pilihan sebelumnya.
function rapikan(d: DataMentah): DataVendor {
  const { pajak, ...sisa } = d
  const hasil = {
    ...sisa,
    pajakTermasuk: pajak === 'termasuk',
    pajakPersen: pajak === 'termasuk' ? 0 : (d.pajakPersen ?? 0),
  }

  if (d.caraHitung === 'tetap') {
    return {
      ...hasil,
      jumlahTermasuk: null,
      tarifPerSatuan: null,
      minimumUnit: null,
      // Satuan hanya dipertahankan bila paket ini dibatasi jumlah tertentu
      satuan: d.maksimumUnit !== null ? d.satuan : null,
    }
  }
  if (d.caraHitung === 'per_satuan') {
    return { ...hasil, hargaDasar: null, jumlahTermasuk: null }
  }
  return { ...hasil, minimumUnit: null }
}

export const skemaVendor = dasarVendor.superRefine(periksaKeterkaitan).transform(rapikan)

export const skemaUbahVendor = dasarVendor
  .extend({ id: z.uuid('Vendor tidak valid') })
  .superRefine(periksaKeterkaitan)
  .transform((d) => ({ ...rapikan(d), id: d.id }))

export const skemaIdVendor = z.object({
  id: z.uuid('Vendor tidak valid'),
})

// ---------- Biaya tambahan ----------

export const skemaBiaya = z
  .object({
    vendorId: z.uuid('Vendor tidak valid'),
    nama: z
      .string()
      .trim()
      .min(1, 'Nama biaya wajib diisi')
      .max(BATAS_NAMA_BIAYA, `Nama biaya maksimal ${BATAS_NAMA_BIAYA} karakter`),
    jenis: z.enum(DAFTAR_JENIS_BIAYA, { error: 'Pilih jenis' }),
    // Kosong berarti belum diketahui, hanya boleh untuk jenis biaya
    nominal: angkaOpsional(12, 'Isi nominal dengan angka, maksimal 12 digit').refine(
      (v) => v === null || v > 0,
      'Nominal harus lebih dari 0'
    ),
    // Kosong dianggap satu
    jumlah: z
      .string()
      .trim()
      .transform((v) => (v === '' ? '1' : v))
      .pipe(z.string().regex(/^\d{1,3}$/, 'Jumlah berupa angka, maksimal 999'))
      .transform(Number)
      .refine((v) => v >= 1, 'Jumlah minimal 1'),
    satuanLabel: teksOpsional(30, 'Satuan maksimal 30 karakter'),
    // Kotak centang hanya mengirim nilai bila dicentang
    wajib: z
      .string()
      .optional()
      .transform((v) => v === 'on'),
  })
  .superRefine((d, ctx) => {
    // Potongan tanpa nilai tidak berarti apa pun. Aturan yang sama dijaga di database.
    if (d.jenis === 'potongan' && d.nominal === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Isi nominal potongan',
        path: ['nominal'],
      })
    }
  })

export const skemaIdBiaya = z.object({
  id: z.uuid('Biaya tidak valid'),
})

// ---------- Pembacaan form ----------

// Daftar kolom form vendor, satu-satunya sumber untuk Server Action dan pengujian.
// Kolom yang tidak tampil di form (misalnya tarif saat cara hitungnya harga tetap)
// tidak ikut terkirim, jadi dibaca sebagai teks kosong supaya skema tidak keliru
// menganggapnya hilang.
export const KUNCI_FORM_VENDOR = [
  'nama',
  'kategoriId',
  'lokasi',
  'caraHitung',
  'satuan',
  'hargaDasar',
  'jumlahTermasuk',
  'tarifPerSatuan',
  'minimumUnit',
  'maksimumUnit',
  'pajak',
  'pajakPersen',
  'kontak',
  'catatanSurvei',
  'status',
] as const

export function bacaFormVendor(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    KUNCI_FORM_VENDOR.map((k) => [k, String(formData.get(k) ?? '')])
  )
}
