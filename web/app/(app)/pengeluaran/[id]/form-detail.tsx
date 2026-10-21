'use client'

'use client'

import { useActionState, useState } from 'react'
import { Kolom, KELAS_TOMBOL } from '@/components/kolom'
import { KolomRupiah } from '@/components/kolom-rupiah'
import { KolomPilihan } from '@/components/kolom-pilihan'
import { PesanForm } from '@/components/pesan-form'
import { formatRupiah } from '@/lib/format'
import { susunJadwal } from '@/lib/pengeluaran/jadwal'
import type { OpsiKategori } from '@/lib/pengeluaran/kueri'
import type { StatusForm } from '@/lib/validasi/status-form'
import { tambahPembayaran, ubahPengeluaran } from '../actions'

const STATUS_AWAL: StatusForm = {}

type PropsTambahPembayaran = {
  expenseId: string
  belumDijadwalkan: number
  adaDp: boolean
  adaPelunasan: boolean
  jumlahCicilanAda: number
  hariIni: string
}

export function FormTambahPembayaran(props: PropsTambahPembayaran) {
  // Kunci berubah setiap kali keadaan pembayaran berubah, jadi setelah
  // pembayaran tersimpan form dimulai ulang dengan isian awal yang sesuai.
  const kunci = [
    props.adaDp,
    props.adaPelunasan,
    props.jumlahCicilanAda,
    props.belumDijadwalkan,
  ].join('-')

  return <IsiFormPembayaran key={kunci} {...props} />
}

function IsiFormPembayaran({
  expenseId,
  belumDijadwalkan,
  adaDp,
  adaPelunasan,
  jumlahCicilanAda,
  hariIni,
}: PropsTambahPembayaran) {
  const [status, aksi, sedangProses] = useActionState(
    tambahPembayaran,
    STATUS_AWAL
  )

  // DP sudah ada: arahkan ke cicilan. Belum ada: DP yang paling lazim dimulai.
  const jenisAwal = adaDp ? 'cicilan' : 'dp'
  const [jenis, setJenis] = useState(jenisAwal)
  const [jumlah, setJumlah] = useState('3')

  // Pratinjau pembagian cicilan, dihitung dengan fungsi yang sama dengan server
  const pratinjau =
    jenis === 'cicilan'
      ? susunJadwal(
          { jenis: 'cicilan', jumlahCicilan: Number(jumlah), jatuhTempo: hariIni },
          {
            belumDijadwalkan,
            adaDp,
            adaPelunasan,
            jumlahCicilan: jumlahCicilanAda,
          }
        )
      : null

  return (
    <form action={aksi} noValidate className="space-y-4">
      <input type="hidden" name="expenseId" value={expenseId} />

      <KolomPilihan
        id="jenis"
        label="Jenis pembayaran"
        defaultValue={status.nilaiLama?.jenis ?? jenisAwal}
        galat={status.galatField?.jenis}
        onChange={setJenis}
      >
        <option value="dp" disabled={adaDp}>
          {adaDp ? 'DP (sudah ada)' : 'DP'}
        </option>
        <option value="cicilan">Cicilan</option>
        <option value="pelunasan" disabled={adaPelunasan}>
          {adaPelunasan ? 'Pelunasan (sudah ada)' : 'Pelunasan'}
        </option>
      </KolomPilihan>

      {jenis === 'dp' && (
        <KolomRupiah
          id="nominalDp"
          label="Nominal DP"
          defaultValue={status.nilaiLama?.nominalDp}
          galat={status.galatField?.nominalDp}
          bantuan={`Sisa yang belum dijadwalkan ${formatRupiah(belumDijadwalkan)}.`}
        />
      )}

      {jenis === 'cicilan' && (
        <>
          <KolomPilihan
            id="jumlahCicilan"
            label="Dicicil berapa kali"
            defaultValue={status.nilaiLama?.jumlahCicilan ?? '3'}
            galat={status.galatField?.jumlahCicilan}
            onChange={setJumlah}
          >
            {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
              <option key={n} value={n}>
                {n} kali
              </option>
            ))}
          </KolomPilihan>

          {pratinjau && 'baris' in pratinjau ? (
            <div className="rounded-lg bg-[#FBF7F4] p-3 text-sm">
              <p className="mb-1 text-xs text-[#6B524B]">
                Sisa {formatRupiah(belumDijadwalkan)} akan dibagi seperti ini:
              </p>
              <ul className="space-y-0.5">
                {pratinjau.baris.map((b) => (
                  <li key={b.label} className="flex justify-between">
                    <span>{b.label}</span>
                    <span>{formatRupiah(b.nominal)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : pratinjau ? (
            <p role="alert" className="text-sm text-[#B42318]">
              {pratinjau.galat}
            </p>
          ) : null}
        </>
      )}

      {jenis === 'pelunasan' && (
        <p className="rounded-lg bg-[#FBF7F4] px-3.5 py-2.5 text-sm">
          Pelunasan membayar seluruh sisa {formatRupiah(belumDijadwalkan)}{' '}
          sekaligus.
        </p>
      )}

      <Kolom
        id="jatuhTempo"
        label={
          jenis === 'cicilan' ? 'Jatuh tempo cicilan pertama' : 'Jatuh tempo'
        }
        type="date"
        defaultValue={status.nilaiLama?.jatuhTempo ?? hariIni}
        galat={status.galatField?.jatuhTempo}
        bantuan={
          jenis === 'cicilan'
            ? 'Cicilan berikutnya jatuh tempo tiap bulan pada tanggal yang sama.'
            : undefined
        }
      />

      {jenis !== 'cicilan' && (
        <Kolom
          id="dibayarPada"
          label="Tanggal dibayar (opsional)"
          type="date"
          defaultValue={status.nilaiLama?.dibayarPada}
          galat={status.galatField?.dibayarPada}
          bantuan="Isi bila sudah dibayar. Kosongkan bila baru dijadwalkan."
        />
      )}

      <PesanForm status={status} />

      <button type="submit" disabled={sedangProses} className={KELAS_TOMBOL}>
        {sedangProses ? 'Menyimpan...' : 'Tambah pembayaran'}
      </button>
    </form>
  )
}

type PropsUbah = {
  id: string
  kategoriId: string
  deskripsi: string
  nominal: number
  tanggal: string
  kategori: OpsiKategori[]
}

export function AksiUbahPengeluaran({
  id,
  kategoriId,
  deskripsi,
  nominal,
  tanggal,
  kategori,
}: PropsUbah) {
  const [terbuka, setTerbuka] = useState(false)
  const [status, aksi, sedangProses] = useActionState(
    async (sebelumnya: StatusForm, formData: FormData) => {
      const hasil = await ubahPengeluaran(sebelumnya, formData)
      if (hasil.info) setTerbuka(false)
      return hasil
    },
    STATUS_AWAL
  )

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setTerbuka((v) => !v)}
        aria-expanded={terbuka}
        className="rounded-lg border border-[#E8DDD8] px-3 py-1.5 text-sm transition hover:bg-[#FBF7F4]"
      >
        {terbuka ? 'Batal ubah' : 'Ubah pengeluaran'}
      </button>

      {terbuka && (
        <form
          action={aksi}
          noValidate
          className="space-y-4 rounded-lg bg-[#FBF7F4] p-4"
        >
          <input type="hidden" name="id" value={id} />

          <KolomPilihan
            id="kategoriId"
            label="Kategori"
            defaultValue={status.nilaiLama?.kategoriId ?? kategoriId}
            galat={status.galatField?.kategoriId}
          >
            {kategori.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </KolomPilihan>

          <Kolom
            id="deskripsi"
            label="Deskripsi"
            type="text"
            autoComplete="off"
            defaultValue={status.nilaiLama?.deskripsi ?? deskripsi}
            galat={status.galatField?.deskripsi}
          />
          <KolomRupiah
            id="nominal"
            label="Nominal total"
            defaultValue={status.nilaiLama?.nominal ?? String(nominal)}
            galat={status.galatField?.nominal}
            bantuan="Tidak boleh lebih kecil dari total cicilan yang sudah dijadwalkan."
          />
          <Kolom
            id="tanggal"
            label="Tanggal"
            type="date"
            defaultValue={status.nilaiLama?.tanggal ?? tanggal}
            galat={status.galatField?.tanggal}
          />

          <PesanForm status={status} />

          <button type="submit" disabled={sedangProses} className={KELAS_TOMBOL}>
            {sedangProses ? 'Menyimpan...' : 'Simpan perubahan'}
          </button>
        </form>
      )}
    </div>
  )
}