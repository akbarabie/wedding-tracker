import { LABEL_STATUS, hitungPembayaran } from './hitung'
import type { PengeluaranDaftar } from './kueri'

// Titik koma dipilih sebagai pemisah karena Excel dengan pengaturan regional
// Indonesia memakai titik koma. Dengan koma, seluruh isi menumpuk di satu kolom.
const PEMISAH = ';'
const AKHIR_BARIS = '\r\n'

// BOM UTF-8 supaya Excel membaca huruf berakses dan simbol dengan benar
const BOM = '\uFEFF'

// Sel yang diawali karakter ini dibaca Excel sebagai rumus (CSV injection).
// Tab dan carriage return juga dianggap berbahaya menurut panduan OWASP.
const AWAL_BERBAHAYA = /^[\t\r]|^\s*[=+\-@]/

// Mengamankan satu sel teks: menetralkan awalan rumus lalu memberi tanda
// kutip bila isinya mengandung pemisah, tanda kutip, atau baris baru.
export function amankanSel(nilai: string): string {
  let teks = nilai
  if (AWAL_BERBAHAYA.test(teks)) teks = `'${teks}`
  if (/[;"\r\n]/.test(teks)) teks = `"${teks.replace(/"/g, '""')}"`
  return teks
}

const KEPALA = [
  'Tanggal',
  'Deskripsi',
  'Vendor',
  'Kategori',
  'Nominal (Rp)',
  'Status pembayaran',
  'Sudah dibayar (Rp)',
  'Belum dibayar (Rp)',
]

// Menyusun isi berkas CSV dari daftar pengeluaran final.
// Tanggal memakai format ISO dan angka ditulis polos tanpa pemisah ribuan,
// supaya bisa langsung dijumlahkan atau diurutkan di spreadsheet.
export function susunCsv(daftar: PengeluaranDaftar[]): string {
  const baris = daftar.map((p) => {
    const bayar = hitungPembayaran(p.nominal, p.payments)
    return [
      p.tanggal,
      amankanSel(p.deskripsi ?? ''),
      amankanSel(p.vendors?.nama ?? ''),
      amankanSel(p.budget_categories?.nama ?? ''),
      String(p.nominal),
      LABEL_STATUS[p.status_pembayaran],
      String(bayar.dibayar),
      String(bayar.sisaBayar),
    ]
  })

  const isi = [KEPALA, ...baris].map((b) => b.join(PEMISAH)).join(AKHIR_BARIS)
  return BOM + isi + AKHIR_BARIS
}
