'use client'

import { useActionState, useState } from 'react'
import { TombolAksi } from '@/components/tombol-aksi'
import { LABEL_STATUS_DEADLINE, type StatusDeadline } from '@/lib/timeline/label'
import type { StatusForm } from '@/lib/validasi/status-form'
import { hapusTugas, tandaiTugas } from './actions'
import { FormTugas, type OpsiPenanggungJawab } from './form-tugas'

const KELAS_TOMBOL_TEPI =
  'rounded-lg border border-[#E8DDD8] px-3 py-1.5 text-sm text-[#3B2A26] transition hover:bg-[#FBF7F4] disabled:opacity-60'

// Hanya deadline yang perlu perhatian yang diberi penanda warna
const WARNA_STATUS: Partial<Record<StatusDeadline, string>> = {
  terlambat: 'bg-[#FEF3F2] text-[#B42318]',
  segera: 'bg-[#FBF1DC] text-[#8A6A22]',
}

export type DataTugas = {
  id: string
  judul: string
  fase: number
  deadline: string | null
  selesai: boolean
  penanggungJawab: string | null
}

type Props = {
  tugas: DataTugas
  status: StatusDeadline
  // Deadline yang sudah diformat di server, supaya tampilannya sama di semua zona waktu
  labelDeadline: string | null
  labelPenanggungJawab: string | null
  anggota: OpsiPenanggungJawab[]
}

// Lingkaran centang untuk menandai selesai atau membuka lagi
function TombolSelesai({ id, selesai }: { id: string; selesai: boolean }) {
  const [status, aksi, sedangProses] = useActionState<StatusForm, FormData>(
    tandaiTugas,
    {}
  )

  return (
    <form action={aksi} className="shrink-0">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="selesai" value={String(!selesai)} />
      <button
        type="submit"
        role="checkbox"
        aria-checked={selesai}
        aria-label={selesai ? 'Buka lagi tugas ini' : 'Tandai tugas ini selesai'}
        disabled={sedangProses}
        className={`mt-0.5 flex size-6 items-center justify-center rounded-full border-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8924A] disabled:opacity-60 ${
          selesai
            ? 'border-[#2E6B3A] bg-[#2E6B3A] text-white'
            : 'border-[#CDB9B1] bg-white text-transparent hover:border-[#9F5C4C]'
        }`}
      >
        {selesai && (
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden="true">
            <path
              d="M3.5 8.5l3 3 6-6.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      {status.galat && (
        <p role="alert" className="mt-1 max-w-32 text-xs text-[#B42318]">
          {status.galat}
        </p>
      )}
    </form>
  )
}

export function BarisTugas({
  tugas,
  status,
  labelDeadline,
  labelPenanggungJawab,
  anggota,
}: Props) {
  const [sedangUbah, setSedangUbah] = useState(false)
  const warna = WARNA_STATUS[status]

  return (
    <li className="rounded-xl border border-[#E8DDD8] bg-white p-3">
      <div className="flex items-start gap-3">
        <TombolSelesai id={tugas.id} selesai={tugas.selesai} />

        <div className="min-w-0 flex-1">
          <p
            className={
              tugas.selesai
                ? 'text-[#8C7A73] line-through'
                : 'font-medium text-[#3B2A26]'
            }
          >
            {tugas.judul}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B524B]">
            {labelDeadline && <span>Deadline {labelDeadline}</span>}
            {labelPenanggungJawab && <span>PJ: {labelPenanggungJawab}</span>}
            {warna && (
              <span className={`rounded-full px-2 py-0.5 font-medium ${warna}`}>
                {LABEL_STATUS_DEADLINE[status]}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setSedangUbah((v) => !v)}
            aria-expanded={sedangUbah}
            className={KELAS_TOMBOL_TEPI}
          >
            {sedangUbah ? 'Batal' : 'Ubah'}
          </button>
          <TombolAksi
            aksi={hapusTugas}
            nilai={{ id: tugas.id }}
            label="Hapus"
            labelProses="Menghapus..."
            konfirmasi={`Hapus tugas "${tugas.judul}"?\n\nTindakan ini tidak bisa dibatalkan.`}
            bahaya
          />
        </div>
      </div>

      {sedangUbah && (
        <div className="mt-3 rounded-lg bg-[#FBF7F4] p-3">
          <FormTugas
            id={tugas.id}
            anggota={anggota}
            awal={{
              judul: tugas.judul,
              fase: String(tugas.fase),
              deadline: tugas.deadline ?? '',
              penanggungJawab: tugas.penanggungJawab ?? '',
            }}
            saatBerhasil={() => setSedangUbah(false)}
          />
        </div>
      )}
    </li>
  )
}
