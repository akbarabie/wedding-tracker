'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { KELAS_TOMBOL } from '@/components/kolom'
import {
  BATAS_MASUKAN_BROWSER,
  EKSTENSI_BISA_DITAMPILKAN,
  PESAN_FORMAT_NOTA,
  type TipeBerkas,
} from '@/lib/nota/gambar'
import { GalatKompres } from '@/lib/nota/kompres'
import { kenaliBerkas, siapkanBerkasNota } from '@/lib/nota/siapkan'
import { kameraBrowserTersedia, perangkatSentuh } from '@/lib/nota/kamera'
import { formatUkuran } from '@/lib/format'
import { JendelaKamera } from './jendela-kamera'

const KELAS_PILIHAN =
  'inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#E6D3C9] bg-white px-4 py-2.5 text-sm font-medium text-[#3B2A26] transition hover:bg-[#FBF7F4] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#B8924A]'

// Gallery boleh memilih semua format yang didukung. Ekstensi ikut ditulis karena
// sebagian sistem tidak memberi tahu jenis HEIC lewat MIME.
const ACCEPT_BERKAS =
  'image/jpeg,image/png,image/webp,image/heic,application/pdf,.jpg,.jpeg,.png,.webp,.heic,.pdf'

type Pilihan = { berkas: File; tipe: TipeBerkas; pratinjau: string | null }
type Tahap = 'siapkan' | 'unggah' | null

export function FormUnggahNota() {
  const router = useRouter()
  const [pilihan, setPilihan] = useState<Pilihan | null>(null)
  const [tahap, setTahap] = useState<Tahap>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [kameraTerbuka, setKameraTerbuka] = useState(false)
  // Alamat pratinjau disimpan di ref supaya bisa dilepas saat diganti atau saat komponen ditutup
  const pratinjauRef = useRef<string | null>(null)
  // Input tersembunyi untuk kamera sistem di HP (atribut capture)
  const inputKameraRef = useRef<HTMLInputElement>(null)
  // Penjaga unggahan ganda. Dipakai ref, bukan state, karena ref langsung berlaku
  // sedangkan state baru berubah setelah render, sehingga ketukan ganda di layar
  // sentuh bisa lolos dari pemeriksaan berbasis state.
  const sedangUnggahRef = useRef(false)

  useEffect(() => {
    return () => {
      if (pratinjauRef.current) URL.revokeObjectURL(pratinjauRef.current)
    }
  }, [])

  function ganti(berkas: File | null, tipe?: TipeBerkas) {
    if (pratinjauRef.current) URL.revokeObjectURL(pratinjauRef.current)
    pratinjauRef.current = null
    if (!berkas || !tipe) {
      setPilihan(null)
      return
    }
    // Hanya gambar yang bisa ditampilkan semua browser. PDF dan HEIC memakai kotak keterangan.
    if (EKSTENSI_BISA_DITAMPILKAN.includes(tipe.ekstensi)) {
      pratinjauRef.current = URL.createObjectURL(berkas)
    }
    setPilihan({ berkas, tipe, pratinjau: pratinjauRef.current })
  }

  // Jalur masuk bersama untuk berkas dari galeri, kamera HP, dan kamera laptop.
  // Format dicek dari isi berkas, jadi berkas yang namanya diubah tetap tertolak.
  async function terima(berkas: File) {
    setInfo(null)
    if (berkas.size > BATAS_MASUKAN_BROWSER) {
      setGalat('Berkas lebih dari 50 MB, terlalu besar untuk diproses di browser.')
      return
    }
    const tipe = await kenaliBerkas(berkas)
    if (!tipe) {
      setGalat(PESAN_FORMAT_NOTA)
      return
    }
    setGalat(null)
    ganti(berkas, tipe)
  }

  async function saatDipilih(e: ChangeEvent<HTMLInputElement>) {
    const berkas = e.target.files?.[0]
    // Dikosongkan supaya memilih berkas yang sama dua kali tetap memicu perubahan
    e.target.value = ''
    if (!berkas) return
    await terima(berkas)
  }

  // HP dan tablet memakai kamera sistem lewat input berkas. Laptop dan desktop membuka
  // jendela kamera sendiri, karena di sana atribut capture diabaikan dan yang terbuka
  // hanya jendela pemilih berkas.
  function klikKamera() {
    setGalat(null)
    setInfo(null)
    if (perangkatSentuh()) {
      inputKameraRef.current?.click()
      return
    }
    if (!kameraBrowserTersedia()) {
      setGalat(
        'Kamera di browser hanya aktif lewat HTTPS atau localhost. Gunakan tombol pilih dari galeri atau berkas.'
      )
      return
    }
    setKameraTerbuka(true)
  }

  async function saatFotoKamera(berkas: File) {
    setKameraTerbuka(false)
    await terima(berkas)
  }

  async function unggah() {
    if (!pilihan || sedangUnggahRef.current) return
    sedangUnggahRef.current = true
    setGalat(null)
    setInfo(null)
    try {
      setTahap('siapkan')
      const siap = await siapkanBerkasNota(pilihan.berkas)

      setTahap('unggah')
      const formData = new FormData()
      formData.append('berkas', siap)
      const respons = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData,
      })
      const isi: { galat?: string } | null = await respons.json().catch(() => null)
      if (!respons.ok) {
        setGalat(isi?.galat ?? 'Gagal mengunggah nota. Coba lagi.')
        return
      }

      const asal = pilihan.berkas.size
      ganti(null)
      setInfo(
        siap.size < asal * 0.9
          ? `Nota berhasil diunggah dan akan segera dibaca. Ukuran diperkecil dari ${formatUkuran(asal)} menjadi ${formatUkuran(siap.size)}.`
          : 'Nota berhasil diunggah dan akan segera dibaca.'
      )
      router.refresh()
    } catch (e) {
      setGalat(
        e instanceof GalatKompres
          ? e.message
          : 'Koneksi bermasalah. Periksa jaringanmu lalu coba lagi.'
      )
    } finally {
      sedangUnggahRef.current = false
      setTahap(null)
    }
  }

  const sibuk = tahap !== null
  const kelasPilihan = `${KELAS_PILIHAN} ${sibuk ? 'pointer-events-none opacity-60' : ''}`

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={klikKamera}
          disabled={sibuk}
          className={kelasPilihan}
        >
          Ambil foto dengan kamera
        </button>
        <label className={kelasPilihan}>
          Pilih dari galeri atau berkas
          <input
            type="file"
            accept={ACCEPT_BERKAS}
            onChange={saatDipilih}
            disabled={sibuk}
            className="sr-only"
          />
        </label>
        {/* Kamera sistem di HP. Tidak terlihat dan tidak bisa difokus, dibuka lewat tombol di atas */}
        <input
          ref={inputKameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={saatDipilih}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
      </div>

      {kameraTerbuka && (
        <JendelaKamera
          saatTangkap={saatFotoKamera}
          saatTutup={() => setKameraTerbuka(false)}
        />
      )}

      {pilihan && (
        <div className="space-y-3 rounded-lg border border-[#E8DDD8] bg-[#FBF7F4] p-3">
          {pilihan.pratinjau ? (
            <>
              {/* Pratinjau lokal dari berkas yang dipilih, tidak melewati server */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pilihan.pratinjau}
                alt="Pratinjau foto nota yang dipilih"
                className="mx-auto max-h-72 w-auto rounded-md border border-[#E8DDD8] bg-white"
              />
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-md border border-[#E8DDD8] bg-white p-3">
              <span
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-md bg-[#F3EEEC] text-xs font-semibold text-[#7A6A64]"
              >
                {pilihan.tipe.ekstensi.toUpperCase()}
              </span>
              <p className="min-w-0 text-sm text-[#3B2A26]">
                <span className="block truncate">{pilihan.berkas.name}</span>
                <span className="text-[#6B524B]">
                  Berkas {pilihan.tipe.ekstensi.toUpperCase()}, {formatUkuran(pilihan.berkas.size)}
                </span>
              </p>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={unggah}
              disabled={sibuk}
              className={`${KELAS_TOMBOL} sm:w-auto`}
            >
              {tahap === 'siapkan'
                ? 'Memperkecil berkas...'
                : tahap === 'unggah'
                  ? 'Mengunggah...'
                  : 'Unggah nota'}
            </button>
            <button
              type="button"
              onClick={() => ganti(null)}
              disabled={sibuk}
              className="rounded-lg border border-[#E6D3C9] px-4 py-2.5 text-sm transition hover:bg-white disabled:opacity-60"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {galat && (
        <p role="alert" className="rounded-lg bg-[#FEF3F2] px-3.5 py-2.5 text-sm text-[#B42318]">
          {galat}
        </p>
      )}
      {info && (
        <p role="status" className="text-sm text-[#2E6B3A]">
          {info}
        </p>
      )}
    </div>
  )
}
