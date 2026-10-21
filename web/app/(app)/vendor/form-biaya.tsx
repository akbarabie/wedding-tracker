'use client'

import { startTransition, useActionState, useState, type FormEvent } from 'react'
import { Kolom, KELAS_TOMBOL } from '@/components/kolom'
import { KolomAngka } from '@/components/kolom-angka'
import { KolomPilihan } from '@/components/kolom-pilihan'
import { KolomRupiah } from '@/components/kolom-rupiah'
import { PesanForm } from '@/components/pesan-form'
import {
  BATAS_NAMA_BIAYA,
  DAFTAR_JENIS_BIAYA,
  gabungNamaBiaya,
  LABEL_JENIS_BIAYA,
  SARAN_BIAYA,
  type JenisBiaya,
} from '@/lib/vendor/label'
import { tambahBiaya } from './actions'

type Props = {
  vendorId: string
  // Kunci berubah setiap kali daftar biaya berubah, jadi setelah biaya tersimpan
  // form dimulai ulang dengan isian kosong.
  jumlahBiaya: number
}

export function FormBiaya({ vendorId, jumlahBiaya }: Props) {
  return <IsiFormBiaya key={jumlahBiaya} vendorId={vendorId} />
}

function IsiFormBiaya({ vendorId }: { vendorId: string }) {
  const [status, aksi, sedangProses] = useActionState(tambahBiaya, {})
  const galat = (kunci: string) => status.galatField?.[kunci]

  // Nama dan jenis dipegang lewat state: tombol saran mengisi nama, dan jenis
  // mengubah label serta aturan kolom nominal
  const [nama, setNama] = useState('')
  const [jenis, setJenis] = useState<JenisBiaya>('biaya')
  const potongan = jenis === 'potongan'

  // Dikirim lewat onSubmit supaya isian tidak hilang saat validasi gagal
  function saatKirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    startTransition(() => aksi(data))
  }

  return (
    <form onSubmit={saatKirim} noValidate className="space-y-4">
      <input type="hidden" name="vendorId" value={vendorId} />

      <KolomPilihan
        id="jenis"
        label="Jenis"
        value={jenis}
        onChange={(v) => setJenis(v as JenisBiaya)}
        galat={galat('jenis')}
      >
        {DAFTAR_JENIS_BIAYA.map((j) => (
          <option key={j} value={j}>
            {LABEL_JENIS_BIAYA[j]}
          </option>
        ))}
      </KolomPilihan>

      <div className="space-y-2">
        <Kolom
          id="nama"
          label={potongan ? 'Nama potongan' : 'Nama biaya'}
          type="text"
          autoComplete="off"
          placeholder={
            potongan
              ? 'Contoh: Cashback hari biasa, diskon paket'
              : 'Contoh: Listrik tambahan, keamanan, sound system'
          }
          value={nama}
          onChange={setNama}
          galat={galat('nama')}
        />

        {/* Saran nama hanya untuk biaya. Mengetuk saran menambahkannya di samping nama
            yang sudah ada, dipisah koma, jadi beberapa saran bisa digabung. */}
        {!potongan && (
          <details className="text-xs text-[#6B524B]">
            <summary className="cursor-pointer">Saran nama biaya (ketuk beberapa, otomatis dipisah koma)</summary>
            <div className="mt-2 space-y-2">
              {SARAN_BIAYA.map((k) => (
                <div key={k.kelompok}>
                  <p className="mb-1 font-medium">{k.kelompok}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {k.nama.map((n) => {
                      const gabungan = gabungNamaBiaya(nama, n)
                      // Saran yang membuat nama melebihi batas dinonaktifkan
                      const kepanjangan =
                        gabungan !== nama && gabungan.length > BATAS_NAMA_BIAYA
                      return (
                        <button
                          key={n}
                          type="button"
                          disabled={kepanjangan}
                          onClick={() => setNama((sekarang) => gabungNamaBiaya(sekarang, n))}
                          className="rounded-full border border-[#E8DDD8] bg-white px-2.5 py-1 text-xs text-[#3B2A26] transition hover:border-[#B8924A] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {n}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <KolomRupiah
          id="nominal"
          label={potongan ? 'Nominal potongan' : 'Total Biaya Tambahan (opsional)'}
          galat={galat('nominal')}
          bantuan={
            potongan
              ? undefined
              : 'Kosongkan bila vendor hanya menulis "kena charge" tanpa tarif.'
          }
        />
        <KolomAngka
          id="jumlah"
          label="Jumlah"
          maksDigit={3}
          defaultValue="1"
          galat={galat('jumlah')}
          bantuan="Misalnya 2 untuk dua pramusaji tambahan."
        />
      </div>

      <Kolom
        id="satuanLabel"
        label="Satuan jumlah (opsional)"
        type="text"
        autoComplete="off"
        placeholder="Contoh: orang, set, jam"
        galat={galat('satuanLabel')}
      />

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="wajib" className="mt-1" />
        <span>
          {potongan
            ? 'Pasti berlaku. Selalu mengurangi total perbandingan. Tanpa dicentang dianggap bersyarat (misalnya cashback untuk hari biasa) dan hanya ditampilkan.'
            : 'Wajib. Pasti dikenakan, jadi selalu dihitung di total perbandingan. Tanpa dicentang dianggap opsional dan hanya ditampilkan.'}
        </span>
      </label>

      <PesanForm status={status} />

      <button type="submit" disabled={sedangProses} className={KELAS_TOMBOL}>
        {sedangProses ? 'Menyimpan...' : potongan ? 'Tambah potongan' : 'Tambah biaya'}
      </button>
    </form>
  )
}
