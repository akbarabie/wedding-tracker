// Kategori, sub-kategori, pihak, jenis undangan, dan status RSVP tamu (PRD 6.4, diperluas).
// Semua nilai harus sama dengan CHECK dan tabel ref_sub_kategori_tamu di migrasi 16.

// ---------- Kategori (kelompok besar)
export const DAFTAR_KATEGORI_TAMU = [
  'keluarga',
  'saudara_kerabat',
  'teman_sahabat',
  'kolega_profesional',
  'tetangga',
  'vip_khusus',
  'lainnya',
] as const
export type KategoriTamu = (typeof DAFTAR_KATEGORI_TAMU)[number]

export const LABEL_KATEGORI_TAMU: Record<KategoriTamu, string> = {
  keluarga: 'Keluarga',
  saudara_kerabat: 'Saudara / Kerabat',
  teman_sahabat: 'Teman & Sahabat',
  kolega_profesional: 'Kolega / Profesional',
  tetangga: 'Tetangga',
  vip_khusus: 'Tamu VIP & Khusus',
  lainnya: 'Lainnya',
}

// ---------- Pihak
export const DAFTAR_PIHAK = ['cpp', 'cpw', 'bersama'] as const
export type Pihak = (typeof DAFTAR_PIHAK)[number]

// Label panjang untuk pilihan di form, label singkat untuk daftar
export const LABEL_PIHAK: Record<Pihak, string> = {
  cpp: 'CPP (pihak calon pengantin pria)',
  cpw: 'CPW (pihak calon pengantin wanita)',
  bersama: 'Bersama (tidak terikat satu pihak)',
}
export const LABEL_PIHAK_SINGKAT: Record<Pihak, string> = {
  cpp: 'CPP',
  cpw: 'CPW',
  bersama: 'Bersama',
}

// ---------- Jenis undangan
export const DAFTAR_JENIS_UNDANGAN = ['cetak', 'digital', 'cetak_digital'] as const
export type JenisUndangan = (typeof DAFTAR_JENIS_UNDANGAN)[number]

export const LABEL_JENIS_UNDANGAN: Record<JenisUndangan, string> = {
  cetak: 'Cetak',
  digital: 'Digital',
  cetak_digital: 'Cetak & Digital',
}

// ---------- Sub-kategori
export type SubKategori = {
  kategori: KategoriTamu
  kunci: string
  label: string
  // Penjelasan singkat yang ditampilkan di pilihan form
  keterangan?: string
  // Pihak yang boleh dipilih, sama dengan pihak_diizinkan di tabel referensi
  pihak: readonly Pihak[]
}

const SISI: readonly Pihak[] = ['cpp', 'cpw']
const SEMUA: readonly Pihak[] = ['cpp', 'cpw', 'bersama']
const BERSAMA: readonly Pihak[] = ['bersama']

// Urutan di sini menjadi urutan tampil di form. Sub-kategori bertanda (tambahan)
// ditambahkan di luar daftar awal pengguna dan mudah dihapus bila tidak diperlukan.
export const DAFTAR_SUB_KATEGORI: readonly SubKategori[] = [
  // Keluarga
  { kategori: 'keluarga', kunci: 'keluarga_inti', label: 'Keluarga Inti', keterangan: 'Ayah, Ibu, Kakak/Adik Kandung', pihak: SISI },
  { kategori: 'keluarga', kunci: 'kakek_nenek', label: 'Kakek / Nenek', pihak: SISI },
  { kategori: 'keluarga', kunci: 'paman_bibi', label: 'Paman / Bibi (Om/Tante)', pihak: SISI },
  { kategori: 'keluarga', kunci: 'sepupu', label: 'Sepupu', pihak: SISI },
  { kategori: 'keluarga', kunci: 'keponakan', label: 'Keponakan', pihak: SISI }, // tambahan
  { kategori: 'keluarga', kunci: 'ipar', label: 'Ipar', keterangan: 'Pasangan dari kakak atau adik kandung', pihak: SISI }, // tambahan
  // Saudara dan kerabat
  { kategori: 'saudara_kerabat', kunci: 'kerabat_marga', label: 'Kerabat / Marga / Suku', pihak: SISI },
  { kategori: 'saudara_kerabat', kunci: 'kerabat_jauh', label: 'Kerabat Jauh', pihak: SISI },
  // Teman dan sahabat
  { kategori: 'teman_sahabat', kunci: 'sahabat_karib', label: 'Sahabat Karib (Inner Circle)', pihak: SISI },
  { kategori: 'teman_sahabat', kunci: 'teman_masa_kecil', label: 'Teman Masa Kecil / Tetangga Asal', pihak: SISI },
  { kategori: 'teman_sahabat', kunci: 'teman_sekolah', label: 'Teman Sekolah / Kuliah', pihak: SISI },
  { kategori: 'teman_sahabat', kunci: 'pendamping', label: 'Pendamping (Bridesmaids / Groomsmen)', keterangan: 'Bridesmaids untuk CPW, Groomsmen untuk CPP', pihak: SISI },
  { kategori: 'teman_sahabat', kunci: 'komunitas_hobi', label: 'Komunitas / Hobi', pihak: SISI },
  { kategori: 'teman_sahabat', kunci: 'komunitas_keagamaan', label: 'Jamaah / Komunitas Keagamaan', pihak: SISI }, // tambahan
  // Kolega dan profesional
  { kategori: 'kolega_profesional', kunci: 'rekan_kerja', label: 'Rekan Kerja / Tim Kantor', pihak: SISI },
  { kategori: 'kolega_profesional', kunci: 'klien_partner', label: 'Klien / Partner Bisnis', pihak: SISI },
  { kategori: 'kolega_profesional', kunci: 'relasi_organisasi', label: 'Relasi Organisasi / Asosiasi', pihak: SISI },
  // Tetangga
  { kategori: 'tetangga', kunci: 'tetangga_domisili', label: 'Tetangga Domisili / Kos / Kontrakan', pihak: SISI },
  // Tamu VIP dan khusus
  { kategori: 'vip_khusus', kunci: 'pimpinan_atasan', label: 'Pimpinan / Atasan Kantor', pihak: SISI },
  { kategori: 'vip_khusus', kunci: 'tokoh_pejabat', label: 'Tokoh Masyarakat / Pejabat Khusus', pihak: SISI },
  { kategori: 'vip_khusus', kunci: 'tokoh_agama', label: 'Tokoh Agama / Pemuka Agama', pihak: SISI }, // tambahan
  { kategori: 'vip_khusus', kunci: 'guru_dosen_mentor', label: 'Guru / Dosen / Mentor Pembimbing', pihak: SISI },
  { kategori: 'vip_khusus', kunci: 'vendor_utama', label: 'Vendor / Partner Utama', pihak: BERSAMA },
  { kategori: 'vip_khusus', kunci: 'panitia_petugas', label: 'Panitia / Petugas Acara', keterangan: 'Penerima tamu, among tamu, dan petugas lain yang ikut makan', pihak: BERSAMA }, // tambahan
  // Lainnya
  { kategori: 'lainnya', kunci: 'lainnya', label: 'Lainnya', pihak: SEMUA },
]

export function subKategoriDari(kategori: string): SubKategori[] {
  return DAFTAR_SUB_KATEGORI.filter((s) => s.kategori === kategori)
}

export function cariSubKategori(
  kategori: string,
  kunci: string | null | undefined
): SubKategori | undefined {
  if (!kunci) return undefined
  return DAFTAR_SUB_KATEGORI.find((s) => s.kategori === kategori && s.kunci === kunci)
}

export function adalahPihak(nilai: string | null | undefined): nilai is Pihak {
  return (DAFTAR_PIHAK as readonly string[]).includes(nilai ?? '')
}

// Label tamu untuk daftar: sub-kategori digabung dengan pihak, mengikuti penamaan pengguna.
// Contoh: "Keluarga Inti CPP", "Bridesmaids (Pendamping CPW)", "Vendor / Partner Utama".
// Tamu lama yang belum dirinci ditampilkan sebagai nama kategorinya saja.
export function labelTamu(
  kategori: string,
  subKategori: string | null | undefined,
  pihak: string | null | undefined
): string {
  const sub = cariSubKategori(kategori, subKategori)
  const namaKategori = LABEL_KATEGORI_TAMU[kategori as KategoriTamu] ?? kategori
  if (!sub) return `${namaKategori} (belum dirinci)`

  if (sub.kunci === 'pendamping') {
    if (pihak === 'cpw') return 'Bridesmaids (Pendamping CPW)'
    if (pihak === 'cpp') return 'Groomsmen (Pendamping CPP)'
  }
  // Pihak "bersama" tidak perlu ditulis di belakang nama, kecuali untuk "Lainnya"
  const akhiran =
    adalahPihak(pihak) && (pihak !== 'bersama' || sub.pihak.length > 1)
      ? ` ${LABEL_PIHAK_SINGKAT[pihak]}`
      : ''
  return `${sub.label}${akhiran}`
}

// ---------- Status RSVP
export const DAFTAR_STATUS_RSVP = [
  'belum_konfirmasi',
  'hadir',
  'tidak_hadir',
  'ragu',
] as const
export type StatusRsvp = (typeof DAFTAR_STATUS_RSVP)[number]

export const LABEL_STATUS_RSVP: Record<StatusRsvp, string> = {
  belum_konfirmasi: 'Belum dikonfirmasi',
  hadir: 'Hadir',
  tidak_hadir: 'Tidak hadir',
  ragu: 'Masih ragu',
}
