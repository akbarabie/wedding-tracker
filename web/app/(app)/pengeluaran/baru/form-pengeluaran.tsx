'use client'

import { useActionState, useState } from 'react'
import { Kolom, KELAS_TOMBOL } from '@/components/kolom'
import { KolomRupiah } from '@/components/kolom-rupiah'
import { KolomPilihan } from '@/components/kolom-pilihan'
import { PesanForm } from '@/components/pesan-form'
import { VENDOR_BARU } from '@/lib/validasi/pengeluaran'
import type { OpsiKategori, OpsiVendor } from '@/lib/pengeluaran/kueri'
import { buatPengeluaran } from '../actions'

type Props = {
  kategori: OpsiKategori[]
  vendor: OpsiVendor[]
  hariIni: string
  // Isian awal dari tautan, misalnya dari tawaran di halaman vendor
  awal?: { kategoriId?: string; vendorId?: string; nominal?: string }
}

export function FormPengeluaran({ kategori, vendor, hariIni, awal }: Props) {
  const [status, aksi, sedangProses] = useActionState(buatPengeluaran, {})
  // Dipantau supaya kolom nama vendor baru hanya tampil saat dibutuhkan
  const [vendorId, setVendorId] = useState('')

  const resepsi = kategori.filter((k) => !k.di_luar_budget_resepsi)
  const luar = kategori.filter((k) => k.di_luar_budget_resepsi)

  return (
    <form action={aksi} noValidate className="space-y-4">
      <KolomPilihan
        id="kategoriId"
        label="Kategori"
        defaultValue={status.nilaiLama?.kategoriId ?? awal?.kategoriId ?? ''}
        galat={status.galatField?.kategoriId}
      >
        <option value="">Pilih kategori</option>
        <optgroup label="Resepsi">
          {resepsi.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </optgroup>
        <optgroup label="Di luar budget resepsi">
          {luar.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </optgroup>
      </KolomPilihan>

      <KolomPilihan
        id="vendorId"
        label="Vendor"
        defaultValue={status.nilaiLama?.vendorId ?? awal?.vendorId ?? ''}
        galat={status.galatField?.vendorId}
        onChange={setVendorId}
      >
        <option value="">Pilih vendor</option>
        {vendor.map((v) => (
          <option key={v.id} value={v.id}>
            {v.nama}
          </option>
        ))}
        <option value={VENDOR_BARU}>+ Vendor baru</option>
      </KolomPilihan>
      <p className="-mt-2 text-xs text-[#6B524B]">
        Vendor yang dipilih otomatis berstatus deal setelah pengeluaran disimpan.
      </p>

      {vendorId === VENDOR_BARU && (
        <Kolom
          id="vendorBaru"
          label="Nama vendor baru"
          type="text"
          autoComplete="off"
          defaultValue={status.nilaiLama?.vendorBaru}
          galat={status.galatField?.vendorBaru}
          bantuan="Vendor baru otomatis berstatus deal. Detailnya bisa dilengkapi di modul vendor."
        />
      )}

      <Kolom
        id="deskripsi"
        label="Deskripsi (opsional)"
        type="text"
        autoComplete="off"
        placeholder="Contoh: Paket catering 300 porsi"
        defaultValue={status.nilaiLama?.deskripsi}
        galat={status.galatField?.deskripsi}
      />

      <KolomRupiah
        id="nominal"
        label="Nominal total"
        defaultValue={status.nilaiLama?.nominal ?? awal?.nominal}
        galat={status.galatField?.nominal}
        bantuan="Total yang disepakati dengan vendor. Cicilan diatur setelah disimpan."
      />

      <Kolom
        id="tanggal"
        label="Tanggal"
        type="date"
        defaultValue={status.nilaiLama?.tanggal ?? hariIni}
        galat={status.galatField?.tanggal}
      />

      <PesanForm status={status} />

      <button type="submit" disabled={sedangProses} className={KELAS_TOMBOL}>
        {sedangProses ? 'Menyimpan...' : 'Simpan pengeluaran'}
      </button>
    </form>
  )
}