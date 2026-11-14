'use client'

import { useActionState, useState } from 'react'
import { TombolAksi } from '@/components/tombol-aksi'
import { berlakuUntukPihak } from '@/lib/administrasi/hitung'
import {
  LABEL_BERLAKU,
  LABEL_PIHAK_DOKUMEN,
  type Berlaku,
  type PihakDokumen,
} from '@/lib/administrasi/label'
import type { StatusForm } from '@/lib/validasi/status-form'
import { hapusDokumen, tandaiDokumen } from './actions'
import { FormDokumen } from './form-dokumen'

const KELAS_TOMBOL_TEPI =
  'rounded-lg border border-[#E8DDD8] px-3 py-1.5 text-sm text-[#3B2A26] transition hover:bg-[#FBF7F4] disabled:opacity-60'

export type DataDokumen = {
  id: string
  judul: string
  berlakuUntuk: Berlaku
  selesaiCpp: boolean
  selesaiCpw: boolean
  catatan: string | null
}

// Satu sel status untuk satu pihak. Bila dokumen tidak berlaku untuk pihak itu,
// sel hanya menampilkan tanda strip dan tidak bisa dicentang.
function SelPihak({
  dokumenId,
  judul,
  pihak,
  berlaku,
  selesai,
}: {
  dokumenId: string
  judul: string
  pihak: PihakDokumen
  berlaku: boolean
  selesai: boolean
}) {
  const [status, aksi, sedangProses] = useActionState<StatusForm, FormData>(
    tandaiDokumen,
    {}
  )
  const nama = LABEL_PIHAK_DOKUMEN[pihak]

  if (!berlaku) {
    return (
      <div className="flex min-w-14 flex-col items-center gap-1">
        <span className="text-xs text-[#8C7A73]">{nama}</span>
        <span
          role="img"
          aria-label={`${nama} tidak berlaku untuk dokumen ini`}
          className="flex size-6 items-center justify-center text-[#B8ABA5]"
        >
          -
        </span>
      </div>
    )
  }

  return (
    <form action={aksi} className="flex min-w-14 flex-col items-center gap-1">
      <input type="hidden" name="id" value={dokumenId} />
      <input type="hidden" name="pihak" value={pihak} />
      <input type="hidden" name="selesai" value={String(!selesai)} />
      <span className="text-xs text-[#6B524B]">{nama}</span>
      <button
        type="submit"
        role="checkbox"
        aria-checked={selesai}
        aria-label={`${nama}: ${judul}`}
        disabled={sedangProses}
        className={`flex size-6 items-center justify-center rounded-md border-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B8924A] disabled:opacity-60 ${
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
        <p role="alert" className="max-w-24 text-center text-xs text-[#B42318]">
          {status.galat}
        </p>
      )}
    </form>
  )
}

export function BarisDokumen({ dokumen }: { dokumen: DataDokumen }) {
  const [sedangUbah, setSedangUbah] = useState(false)

  return (
    <li className="rounded-xl border border-[#E8DDD8] bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{dokumen.judul}</p>
          {dokumen.berlakuUntuk !== 'keduanya' && (
            <p className="text-xs text-[#6B524B]">{LABEL_BERLAKU[dokumen.berlakuUntuk]}</p>
          )}
          {dokumen.catatan && (
            <p className="text-xs text-[#6B524B]">{dokumen.catatan}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SelPihak
            dokumenId={dokumen.id}
            judul={dokumen.judul}
            pihak="cpp"
            berlaku={berlakuUntukPihak(dokumen.berlakuUntuk, 'cpp')}
            selesai={dokumen.selesaiCpp}
          />
          <SelPihak
            dokumenId={dokumen.id}
            judul={dokumen.judul}
            pihak="cpw"
            berlaku={berlakuUntukPihak(dokumen.berlakuUntuk, 'cpw')}
            selesai={dokumen.selesaiCpw}
          />
          <button
            type="button"
            onClick={() => setSedangUbah((v) => !v)}
            aria-expanded={sedangUbah}
            className={KELAS_TOMBOL_TEPI}
          >
            {sedangUbah ? 'Batal' : 'Ubah'}
          </button>
          <TombolAksi
            aksi={hapusDokumen}
            nilai={{ id: dokumen.id }}
            label="Hapus"
            labelProses="Menghapus..."
            konfirmasi={`Hapus dokumen "${dokumen.judul}"?\n\nTindakan ini tidak bisa dibatalkan.`}
            bahaya
          />
        </div>
      </div>

      {sedangUbah && (
        <div className="mt-3 rounded-lg bg-[#FBF7F4] p-3">
          <FormDokumen
            id={dokumen.id}
            awal={{
              judul: dokumen.judul,
              berlakuUntuk: dokumen.berlakuUntuk,
              catatan: dokumen.catatan ?? '',
            }}
            saatBerhasil={() => setSedangUbah(false)}
          />
        </div>
      )}
    </li>
  )
}
