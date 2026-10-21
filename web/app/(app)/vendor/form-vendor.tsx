'use client'

import { startTransition, useActionState, useState, type FormEvent } from 'react'
import { Kolom, KELAS_TOMBOL } from '@/components/kolom'
import { KolomAngka } from '@/components/kolom-angka'
import { KolomAreaTeks } from '@/components/kolom-area-teks'
import { KolomPilihan } from '@/components/kolom-pilihan'
import { KolomRupiah } from '@/components/kolom-rupiah'
import { PesanForm } from '@/components/pesan-form'
import {
  DAFTAR_CARA_HITUNG,
  DAFTAR_SATUAN,
  DAFTAR_STATUS_VENDOR,
  LABEL_CARA_HITUNG,
  LABEL_PILIHAN_SATUAN,
  LABEL_STATUS_VENDOR,
  NAMA_SATUAN,
  type Satuan,
} from '@/lib/vendor/label'
import type { OpsiKategori } from '@/lib/pengeluaran/kueri'
import { tambahVendor, ubahVendor } from './actions'

type Props = {
  kategori: OpsiKategori[]
  // Bila id diisi, form bekerja sebagai form ubah. Bila tidak, form tambah.
  id?: string
  // Nilai awal berupa teks, sama seperti yang dikirim form
  awal?: Record<string, string>
  // Mengunci status pada deal, dipakai saat vendor sudah punya pembayaran dibayar.
  // Database tetap menjadi penjaga utamanya, ini hanya agar pengguna tidak salah pilih.
  kunciDeal?: boolean
  // Keterangan di bawah pilihan status, misalnya akibat dari menolak vendor
  catatanStatus?: string
}

// Penjelasan singkat tiap cara hitung, dengan contoh yang akrab bagi pengguna
const PENJELASAN_CARA: Record<string, string> = {
  tetap:
    'Satu harga tanpa tambahan per satuan, misalnya dekorasi, band, atau paket dokumentasi.',
  per_satuan:
    'Tarif dikalikan jumlah yang dibutuhkan, misalnya catering Rp 150.000 per tamu.',
  paket_tambahan:
    'Harga paket sudah mencakup sejumlah satuan, kelebihannya dikenai tarif tambahan. Misalnya gedung 4 jam lalu jam tambahan, atau rias pengantin dengan orang tambahan.',
}

// Pilihan satuan untuk harga tetap yang dibatasi jumlah tertentu
const LABEL_BATAS: Record<Satuan, string> = {
  tamu: 'Ya, dibatasi jumlah tamu (pax)',
  jam: 'Ya, dibatasi durasi (jam)',
  orang: 'Ya, dibatasi jumlah orang',
  buah: 'Ya, dibatasi jumlah buah',
}

export function FormVendor({
  kategori,
  id,
  awal,
  kunciDeal = false,
  catatanStatus,
}: Props) {
  const [status, aksi, sedangProses] = useActionState(
    id ? ubahVendor : tambahVendor,
    {}
  )

  // Nilai awal untuk kolom yang tidak terkontrol
  const nilai = (kunci: string) => status.nilaiLama?.[kunci] ?? awal?.[kunci] ?? ''
  const galat = (kunci: string) => status.galatField?.[kunci]

  // Tiga pilihan ini mengubah isi form, jadi dipegang lewat state
  const [cara, setCara] = useState(nilai('caraHitung') || 'tetap')
  const [satuan, setSatuan] = useState(nilai('satuan'))
  const [pajak, setPajak] = useState(nilai('pajak') || 'termasuk')

  const namaSatuan = satuan ? NAMA_SATUAN[satuan as Satuan] : 'satuan'

  const resepsi = kategori.filter((k) => !k.di_luar_budget_resepsi)
  const luar = kategori.filter((k) => k.di_luar_budget_resepsi)

  // Form dikirim lewat onSubmit, bukan form action, supaya React 19 tidak mereset
  // tampilan form setelah Server Action selesai. Pilihan terkontrol di atas akan
  // kembali ke nilai awalnya bila form direset, dan isian pengguna ikut tergeser.
  function saatKirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    startTransition(() => aksi(data))
  }

  return (
    <form onSubmit={saatKirim} noValidate className="space-y-4">
      {id && <input type="hidden" name="id" value={id} />}

      <Kolom
        id="nama"
        label="Nama vendor"
        type="text"
        autoComplete="off"
        defaultValue={nilai('nama')}
        galat={galat('nama')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <KolomPilihan
          id="kategoriId"
          label="Kategori"
          defaultValue={nilai('kategoriId')}
          galat={galat('kategoriId')}
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
          id="status"
          label="Status"
          defaultValue={kunciDeal ? 'deal' : nilai('status') || 'disurvei'}
          galat={galat('status')}
        >
          {DAFTAR_STATUS_VENDOR.map((s) => (
            <option key={s} value={s} disabled={kunciDeal && s !== 'deal'}>
              {LABEL_STATUS_VENDOR[s]}
            </option>
          ))}
        </KolomPilihan>
      </div>

      {catatanStatus && (
        <p className="-mt-2 text-xs text-[#6B524B]">{catatanStatus}</p>
      )}

      {/* ---------- Cara vendor menghitung harga ---------- */}
      <fieldset className="space-y-4 rounded-xl border border-[#E8DDD8] p-4">
        <legend className="px-1 text-sm font-semibold">Harga</legend>

        <div className="space-y-1.5">
          <KolomPilihan
            id="caraHitung"
            label="Cara vendor menghitung harga"
            value={cara}
            onChange={setCara}
            galat={galat('caraHitung')}
          >
            {DAFTAR_CARA_HITUNG.map((c) => (
              <option key={c} value={c}>
                {LABEL_CARA_HITUNG[c]}
              </option>
            ))}
          </KolomPilihan>
          <p className="text-xs text-[#6B524B]">{PENJELASAN_CARA[cara]}</p>
        </div>

        {cara === 'tetap' && (
          <>
            <KolomRupiah
              id="hargaDasar"
              label="Harga (opsional)"
              defaultValue={nilai('hargaDasar')}
              galat={galat('hargaDasar')}
              bantuan="Kosongkan bila penawarannya belum ada."
            />
            <KolomPilihan
              id="satuan"
              label="Apakah dibatasi jumlah tertentu?"
              value={satuan}
              onChange={setSatuan}
              galat={galat('satuan')}
            >
              <option value="">Tidak, harga tetap berapa pun jumlahnya</option>
              {DAFTAR_SATUAN.map((s) => (
                <option key={s} value={s}>
                  {LABEL_BATAS[s]}
                </option>
              ))}
            </KolomPilihan>
            {satuan !== '' && (
              <KolomAngka
                id="maksimumUnit"
                label={`Maksimal berapa ${namaSatuan}`}
                maksDigit={6}
                defaultValue={nilai('maksimumUnit')}
                galat={galat('maksimumUnit')}
                bantuan="Misalnya paket catering untuk maksimal 400 tamu."
              />
            )}
          </>
        )}

        {cara === 'per_satuan' && (
          <>
            <KolomPilihan
              id="satuan"
              label="Satuan yang dihitung vendor"
              value={satuan}
              onChange={setSatuan}
              galat={galat('satuan')}
            >
              <option value="">Pilih satuan</option>
              {DAFTAR_SATUAN.map((s) => (
                <option key={s} value={s}>
                  {LABEL_PILIHAN_SATUAN[s]}
                </option>
              ))}
            </KolomPilihan>
            <KolomRupiah
              id="tarifPerSatuan"
              label={`Tarif per ${namaSatuan} (opsional)`}
              defaultValue={nilai('tarifPerSatuan')}
              galat={galat('tarifPerSatuan')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <KolomAngka
                id="minimumUnit"
                label="Minimum pesanan (opsional)"
                maksDigit={6}
                defaultValue={nilai('minimumUnit')}
                galat={galat('minimumUnit')}
                bantuan="Di bawah minimum, tetap ditagih sebesar minimum."
              />
              <KolomAngka
                id="maksimumUnit"
                label="Maksimal (opsional)"
                maksDigit={6}
                defaultValue={nilai('maksimumUnit')}
                galat={galat('maksimumUnit')}
              />
            </div>
          </>
        )}

        {cara === 'paket_tambahan' && (
          <>
            <KolomPilihan
              id="satuan"
              label="Satuan yang dihitung vendor"
              value={satuan}
              onChange={setSatuan}
              galat={galat('satuan')}
            >
              <option value="">Pilih satuan</option>
              {DAFTAR_SATUAN.map((s) => (
                <option key={s} value={s}>
                  {LABEL_PILIHAN_SATUAN[s]}
                </option>
              ))}
            </KolomPilihan>
            <div className="grid gap-4 sm:grid-cols-2">
              <KolomRupiah
                id="hargaDasar"
                label="Harga paket (opsional)"
                defaultValue={nilai('hargaDasar')}
                galat={galat('hargaDasar')}
              />
              <KolomAngka
                id="jumlahTermasuk"
                label={`Sudah termasuk berapa ${namaSatuan}`}
                maksDigit={6}
                defaultValue={nilai('jumlahTermasuk')}
                galat={galat('jumlahTermasuk')}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <KolomRupiah
                id="tarifPerSatuan"
                label={`Tambahan per ${namaSatuan} (opsional)`}
                defaultValue={nilai('tarifPerSatuan')}
                galat={galat('tarifPerSatuan')}
              />
              <KolomAngka
                id="maksimumUnit"
                label="Maksimal (opsional)"
                maksDigit={6}
                defaultValue={nilai('maksimumUnit')}
                galat={galat('maksimumUnit')}
              />
            </div>
          </>
        )}
      </fieldset>

      {/* ---------- Pajak, dipisah dari harga dan biaya lainnya ---------- */}
      <fieldset className="space-y-4 rounded-xl border border-[#E8DDD8] p-4">
        <legend className="px-1 text-sm font-semibold">Pajak</legend>
        <KolomPilihan
          id="pajak"
          label="Pajak"
          value={pajak}
          onChange={setPajak}
          galat={galat('pajak')}
        >
          <option value="termasuk">Tidak ada, atau sudah termasuk di harga</option>
          <option value="belum">Belum termasuk, ditambahkan sebagai persen</option>
        </KolomPilihan>
        {pajak === 'belum' && (
          <KolomAngka
            id="pajakPersen"
            label="Persen pajak"
            maksDigit={3}
            placeholder="Contoh: 11"
            defaultValue={nilai('pajakPersen')}
            galat={galat('pajakPersen')}
            bantuan="Persen dari seluruh tagihan vendor ini. Isi persen gabungan bila ada beberapa pajak, misalnya PPN dan pajak restoran."
          />
        )}
      </fieldset>


      <Kolom
        id="lokasi"
        label="Lokasi (opsional)"
        type="text"
        autoComplete="off"
        defaultValue={nilai('lokasi')}
        galat={galat('lokasi')}
      />

      <Kolom
        id="kontak"
        label="Kontak (opsional)"
        type="text"
        autoComplete="off"
        placeholder="Nama dan nomor telepon"
        defaultValue={nilai('kontak')}
        galat={galat('kontak')}
      />

      <KolomAreaTeks
        id="catatanSurvei"
        label="Catatan hasil survei (opsional)"
        defaultValue={nilai('catatanSurvei')}
        galat={galat('catatanSurvei')}
        placeholder="Fasilitas, syarat pembayaran, kesan saat bertemu, dan lain-lain"
      />

      {!id && (
        <p className="rounded-lg bg-[#FBF1DC] px-3.5 py-2.5 text-xs text-[#8A6A22]">
          Biaya lainnya seperti listrik, keamanan, sound system, atau charge
          luar kota ditambahkan di halaman vendor setelah data ini disimpan.
        </p>
      )}

      <PesanForm status={status} />

      <button type="submit" disabled={sedangProses} className={KELAS_TOMBOL}>
        {sedangProses ? 'Menyimpan...' : id ? 'Simpan perubahan' : 'Simpan vendor'}
      </button>
    </form>
  )
}
