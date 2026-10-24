import Link from 'next/link'
import { tingkatPeringatan, labelPeringatan } from '@/lib/budget/hitung'
import { WARNA_BAR, WARNA_TEKS } from '@/lib/budget/warna'
import type { RingkasanKategori } from '@/lib/budget/kueri'
import { formatRupiah, formatTanggalPendek } from '@/lib/format'
import {
  labelSisaHari,
  type PembayaranJatuhTempo,
  type SegmenTamu,
  type TugasJatuhTempo,
} from '@/lib/dashboard/hitung'
import { LABEL_STATUS_RSVP, type StatusRsvp } from '@/lib/tamu/label'

// Kartu angka utama di bagian atas. Seluruh kartu bisa diklik menuju modulnya.
export function KartuStat({
  href,
  judul,
  nilai,
  keterangan,
  merah,
}: {
  href: string
  judul: string
  nilai: string
  keterangan: string
  merah?: boolean
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-[#E8DDD8] bg-white p-4 transition hover:bg-[#FBF7F4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8924A]"
    >
      <p className="text-xs text-[#6B524B]">{judul}</p>
      <p
        className={`mt-1 text-xl font-semibold ${merah ? 'text-[#B42318]' : ''}`}
      >
        {nilai}
      </p>
      <p className="mt-0.5 text-xs text-[#6B524B]">{keterangan}</p>
    </Link>
  )
}

// Bar kemajuan sederhana dengan atribut aksesibilitas progressbar
export function BarKemajuan({
  persen,
  label,
  warna = 'bg-[#9F5C4C]',
}: {
  persen: number
  label: string
  warna?: string
}) {
  const aman = Math.max(0, Math.min(100, persen))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={aman}
      className="h-2 overflow-hidden rounded-full bg-[#F1E9E5]"
    >
      <div className={`h-full ${warna}`} style={{ width: `${aman}%` }} />
    </div>
  )
}

// Satu baris kategori budget versi ringkas: nama, sisa, bar, dan rincian kecil
export function BarisBudgetRingkas({ k }: { k: RingkasanKategori }) {
  const sisa = k.nilai_rencana - k.total_komitmen
  const tingkat = tingkatPeringatan(k.total_komitmen, k.nilai_rencana)
  const persen =
    k.nilai_rencana > 0
      ? Math.round((k.total_komitmen / k.nilai_rencana) * 100)
      : k.total_komitmen > 0
        ? 100
        : 0

  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <Link
          href={`/pengeluaran?kategori=${k.category_id}`}
          className="text-sm font-medium underline-offset-2 hover:underline"
        >
          {k.nama}
        </Link>
        <span className={`text-xs font-medium ${WARNA_TEKS[tingkat]}`}>
          {k.nilai_rencana > 0 || k.total_komitmen > 0
            ? `Sisa ${formatRupiah(sisa)}`
            : labelPeringatan(tingkat, sisa)}
        </span>
      </div>
      <div className="mt-1.5">
        <BarKemajuan
          persen={persen}
          label={`Pemakaian budget ${k.nama}`}
          warna={WARNA_BAR[tingkat]}
        />
      </div>
      <p className="mt-1 text-xs text-[#6B524B]">
        {formatRupiah(k.total_komitmen)} dari {formatRupiah(k.nilai_rencana)}
      </p>
    </li>
  )
}

const WARNA_SEGMEN: Record<StatusRsvp, string> = {
  hadir: 'bg-[#4F8A5B]',
  ragu: 'bg-[#B8924A]',
  belum_konfirmasi: 'bg-[#D9CFCB]',
  tidak_hadir: 'bg-[#8C7A73]',
}

// Bar kehadiran bersegmen beserta legendanya. Segmen kosong tidak digambar
// tetapi tetap muncul di legenda supaya angkanya lengkap.
export function BarKehadiran({ segmen }: { segmen: SegmenTamu[] }) {
  return (
    <div>
      <div
        role="img"
        aria-label={`Kehadiran tamu: ${segmen
          .map((s) => `${LABEL_STATUS_RSVP[s.status]} ${s.orang} orang`)
          .join(', ')}`}
        className="flex h-2.5 overflow-hidden rounded-full bg-[#F1E9E5]"
      >
        {segmen
          .filter((s) => s.orang > 0)
          .map((s) => (
            <div
              key={s.status}
              className={WARNA_SEGMEN[s.status]}
              style={{ width: `${s.persen}%` }}
            />
          ))}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#6B524B]">
        {segmen.map((s) => (
          <li key={s.status} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`size-2 shrink-0 rounded-full ${WARNA_SEGMEN[s.status]}`}
            />
            {LABEL_STATUS_RSVP[s.status]}: {s.orang}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PenandaSisaHari({ sisaHari }: { sisaHari: number }) {
  const warna =
    sisaHari < 0
      ? 'bg-[#FEF3F2] text-[#B42318]'
      : sisaHari <= 1
        ? 'bg-[#FBF1DC] text-[#8A6A22]'
        : 'bg-[#F1E9E5] text-[#6B524B]'
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${warna}`}
    >
      {labelSisaHari(sisaHari)}
    </span>
  )
}

// Batas baris yang ditampilkan per daftar. Sisanya diringkas jadi satu baris.
const BATAS_TAMPIL = 6

export function DaftarTugasJatuhTempo({ tugas }: { tugas: TugasJatuhTempo[] }) {
  if (tugas.length === 0) {
    return <p className="text-sm text-[#6B524B]">Tidak ada tugas yang mendesak.</p>
  }
  const tampil = tugas.slice(0, BATAS_TAMPIL)
  return (
    <ul className="space-y-2">
      {tampil.map((t) => (
        <li
          key={t.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-[#E8DDD8] bg-white p-3"
        >
          <div className="min-w-0">
            <Link
              href={`/timeline#fase-${t.fase}`}
              className="text-sm font-medium underline-offset-2 hover:underline"
            >
              {t.judul}
            </Link>
            <p className="text-xs text-[#6B524B]">
              Deadline {formatTanggalPendek(t.deadline)}
            </p>
          </div>
          <PenandaSisaHari sisaHari={t.sisaHari} />
        </li>
      ))}
      {tugas.length > tampil.length && (
        <li className="text-xs text-[#6B524B]">
          dan {tugas.length - tampil.length} tugas lainnya.{' '}
          <Link href="/timeline" className="text-[#9F5C4C] underline">
            Lihat semua
          </Link>
        </li>
      )}
    </ul>
  )
}

export function DaftarPembayaranJatuhTempo({
  pembayaran,
}: {
  pembayaran: PembayaranJatuhTempo[]
}) {
  if (pembayaran.length === 0) {
    return (
      <p className="text-sm text-[#6B524B]">Tidak ada pembayaran yang mendesak.</p>
    )
  }
  const tampil = pembayaran.slice(0, BATAS_TAMPIL)
  return (
    <ul className="space-y-2">
      {tampil.map((p) => (
        <li
          key={p.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-[#E8DDD8] bg-white p-3"
        >
          <div className="min-w-0">
            <Link
              href={`/pengeluaran/${p.pengeluaranId}`}
              className="text-sm font-medium underline-offset-2 hover:underline"
            >
              {p.vendor ?? p.deskripsi ?? 'Pengeluaran'}
            </Link>
            <p className="text-xs text-[#6B524B]">
              {p.label}, {formatRupiah(p.nominal)}, jatuh tempo{' '}
              {formatTanggalPendek(p.jatuhTempo)}
            </p>
          </div>
          <PenandaSisaHari sisaHari={p.sisaHari} />
        </li>
      ))}
      {pembayaran.length > tampil.length && (
        <li className="text-xs text-[#6B524B]">
          dan {pembayaran.length - tampil.length} pembayaran lainnya.{' '}
          <Link href="/pengeluaran" className="text-[#9F5C4C] underline">
            Lihat semua
          </Link>
        </li>
      )}
    </ul>
  )
}
