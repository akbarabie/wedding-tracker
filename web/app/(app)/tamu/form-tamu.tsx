'use client'

import { startTransition, useActionState, useState, type FormEvent } from 'react'
import { Kolom, KELAS_TOMBOL } from '@/components/kolom'
import { KolomAngka } from '@/components/kolom-angka'
import { KolomPilihan } from '@/components/kolom-pilihan'
import { PesanForm } from '@/components/pesan-form'
import {
  DAFTAR_JENIS_UNDANGAN,
  DAFTAR_KATEGORI_TAMU,
  DAFTAR_PIHAK,
  DAFTAR_STATUS_RSVP,
  LABEL_JENIS_UNDANGAN,
  LABEL_KATEGORI_TAMU,
  LABEL_PIHAK,
  LABEL_STATUS_RSVP,
  cariSubKategori,
  subKategoriDari,
  type Pihak,
} from '@/lib/tamu/label'
import type { StatusForm } from '@/lib/validasi/status-form'
import { tambahTamu, ubahTamu } from './actions'

type Props = {
  // Bila id diisi, form bekerja sebagai form ubah. Bila tidak, form tambah.
  id?: string
  // Nilai awal berupa teks, sama seperti yang dikirim form
  awal?: Record<string, string>
  // Dipanggil setelah ubah berhasil, misalnya untuk menutup panel ubah
  saatBerhasil?: () => void
}

// Untuk pendamping, nama pihaknya lebih mudah dipahami dengan sebutan Bridesmaids dan Groomsmen
function labelPilihanPihak(pihak: Pihak, subKunci: string): string {
  if (subKunci === 'pendamping') {
    if (pihak === 'cpw') return 'CPW (Bridesmaids, pendamping calon pengantin wanita)'
    if (pihak === 'cpp') return 'CPP (Groomsmen, pendamping calon pengantin pria)'
  }
  return LABEL_PIHAK[pihak]
}

export function FormTamu({ id, awal, saatBerhasil }: Props) {
  // Versi dinaikkan setelah tambah berhasil supaya form dibuat ulang dan isiannya kosong
  const [versi, setVersi] = useState(0)

  const nilaiAwal = (kunci: string) => awal?.[kunci] ?? ''

  // Tiga pilihan ini saling bergantung, jadi dipegang sebagai state (terkontrol)
  const [kategori, setKategori] = useState(nilaiAwal('kategori') || 'keluarga')
  const [sub, setSub] = useState(nilaiAwal('subKategori'))
  const [pihak, setPihak] = useState(nilaiAwal('pihak'))

  const [status, aksi, sedangProses] = useActionState(
    async (sebelumnya: StatusForm, formData: FormData) => {
      const hasil = await (id ? ubahTamu : tambahTamu)(sebelumnya, formData)
      if (hasil.info) {
        if (id) {
          saatBerhasil?.()
        } else {
          setKategori('keluarga')
          setSub('')
          setPihak('')
          setVersi((v) => v + 1)
        }
      }
      return hasil
    },
    {}
  )

  const nilai = (kunci: string) => status.nilaiLama?.[kunci] ?? awal?.[kunci] ?? ''
  const galat = (kunci: string) => status.galatField?.[kunci]
  // Id unik per form supaya label tidak bentrok saat beberapa panel ubah terbuka
  const idUnik = (kunci: string) => (id ? `${kunci}-${id}` : kunci)

  const daftarSub = subKategoriDari(kategori)
  const subTerpilih = cariSubKategori(kategori, sub)
  // Sebelum sub-kategori dipilih semua pihak tampil. Sesudahnya hanya yang diizinkan.
  const pihakTersedia: readonly Pihak[] = subTerpilih?.pihak ?? DAFTAR_PIHAK

  function saatKategoriBerubah(baru: string) {
    setKategori(baru)
    // Sub-kategori milik kategori lama tidak berlaku lagi
    setSub('')
  }

  function saatSubBerubah(baru: string) {
    setSub(baru)
    const diizinkan = cariSubKategori(kategori, baru)?.pihak ?? DAFTAR_PIHAK
    // Pihak otomatis terpilih bila hanya ada satu pilihan, dan dikosongkan bila tidak lagi sah
    if (diizinkan.length === 1) setPihak(diizinkan[0])
    else if (!(diizinkan as readonly string[]).includes(pihak)) setPihak('')
  }

  // Dikirim lewat onSubmit, bukan form action, supaya React 19 tidak mereset
  // pilihan select setelah Server Action selesai (lihat catatan di KolomPilihan).
  function saatKirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    startTransition(() => aksi(data))
  }

  return (
    <form key={versi} onSubmit={saatKirim} noValidate className="space-y-4">
      {id && <input type="hidden" name="id" value={id} />}

      <Kolom
        id={idUnik('nama')}
        nama="nama"
        label="Nama tamu"
        type="text"
        autoComplete="off"
        placeholder="Contoh: Keluarga Bapak Hendra"
        defaultValue={nilai('nama')}
        galat={galat('nama')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <KolomPilihan
          id={idUnik('kategori')}
          nama="kategori"
          label="Kategori"
          value={kategori}
          onChange={saatKategoriBerubah}
          galat={galat('kategori')}
        >
          {DAFTAR_KATEGORI_TAMU.map((k) => (
            <option key={k} value={k}>
              {LABEL_KATEGORI_TAMU[k]}
            </option>
          ))}
        </KolomPilihan>

        <div className="space-y-1.5">
          <KolomPilihan
            id={idUnik('subKategori')}
            nama="subKategori"
            label="Sub-kategori"
            value={sub}
            onChange={saatSubBerubah}
            galat={galat('subKategori')}
          >
            <option value="">Pilih sub-kategori</option>
            {daftarSub.map((s) => (
              <option key={s.kunci} value={s.kunci}>
                {s.label}
              </option>
            ))}
          </KolomPilihan>
          {subTerpilih?.keterangan && (
            <p className="text-xs text-[#6B524B]">{subTerpilih.keterangan}</p>
          )}
        </div>

        <KolomPilihan
          id={idUnik('pihak')}
          nama="pihak"
          label="Pihak"
          value={pihak}
          onChange={setPihak}
          galat={galat('pihak')}
        >
          <option value="">Pilih pihak</option>
          {pihakTersedia.map((p) => (
            <option key={p} value={p}>
              {labelPilihanPihak(p, sub)}
            </option>
          ))}
        </KolomPilihan>

        <KolomPilihan
          id={idUnik('jenisUndangan')}
          nama="jenisUndangan"
          label="Jenis undangan"
          defaultValue={nilai('jenisUndangan')}
          galat={galat('jenisUndangan')}
        >
          <option value="">Pilih jenis undangan</option>
          {DAFTAR_JENIS_UNDANGAN.map((j) => (
            <option key={j} value={j}>
              {LABEL_JENIS_UNDANGAN[j]}
            </option>
          ))}
        </KolomPilihan>

        <KolomPilihan
          id={idUnik('statusRsvp')}
          nama="statusRsvp"
          label="Status kehadiran"
          defaultValue={nilai('statusRsvp') || 'belum_konfirmasi'}
          galat={galat('statusRsvp')}
        >
          {DAFTAR_STATUS_RSVP.map((s) => (
            <option key={s} value={s}>
              {LABEL_STATUS_RSVP[s]}
            </option>
          ))}
        </KolomPilihan>

        <KolomAngka
          id={idUnik('jumlahOrang')}
          nama="jumlahOrang"
          label="Jumlah orang"
          defaultValue={nilai('jumlahOrang') || '1'}
          maksDigit={2}
          bantuan="Berapa orang yang diundang lewat undangan ini, 1 sampai 20."
          galat={galat('jumlahOrang')}
        />
      </div>

      <Kolom
        id={idUnik('kontak')}
        nama="kontak"
        label="Kontak (boleh dikosongkan)"
        type="text"
        autoComplete="off"
        placeholder="Nomor telepon atau akun"
        defaultValue={nilai('kontak')}
        galat={galat('kontak')}
      />

      <PesanForm status={status} />

      <button type="submit" disabled={sedangProses} className={`${KELAS_TOMBOL} sm:w-auto`}>
        {sedangProses ? 'Menyimpan...' : id ? 'Simpan perubahan' : 'Tambah tamu'}
      </button>
    </form>
  )
}
