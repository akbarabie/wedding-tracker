'use client'

import { useEffect, useRef, useState } from 'react'
import { KELAS_TOMBOL } from '@/components/kolom'
import {
  bukaKamera,
  hentikanKamera,
  pesanGalatKamera,
  tangkapFrame,
} from '@/lib/nota/kamera'

type Props = {
  saatTangkap: (berkas: File) => void
  saatTutup: () => void
}

type Keadaan = 'meminta' | 'siap' | 'galat'

// Jendela kamera untuk laptop dan komputer desktop. Menampilkan video langsung dari
// kamera dan mengambil satu gambar saat tombol ditekan.
export function JendelaKamera({ saatTangkap, saatTutup }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [keadaan, setKeadaan] = useState<Keadaan>('meminta')
  const [pesan, setPesan] = useState<string | null>(null)
  const [mengambil, setMengambil] = useState(false)

  useEffect(() => {
    let dibatalkan = false
    bukaKamera()
      .then((stream) => {
        // Jendela sudah ditutup sebelum izin kamera selesai: matikan kamera segera
        if (dibatalkan) {
          hentikanKamera(stream)
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          video.play().catch(() => undefined)
        }
      })
      .catch((e) => {
        if (dibatalkan) return
        setPesan(pesanGalatKamera(e))
        setKeadaan('galat')
      })

    return () => {
      dibatalkan = true
      hentikanKamera(streamRef.current)
      streamRef.current = null
    }
  }, [])

  // Tombol Escape menutup jendela
  useEffect(() => {
    function saatTekan(e: KeyboardEvent) {
      if (e.key === 'Escape') saatTutup()
    }
    window.addEventListener('keydown', saatTekan)
    return () => window.removeEventListener('keydown', saatTekan)
  }, [saatTutup])

  async function ambil() {
    const video = videoRef.current
    if (!video || mengambil) return
    setMengambil(true)
    try {
      const berkas = await tangkapFrame(video)
      saatTangkap(berkas)
    } catch {
      setPesan('Gagal mengambil gambar dari kamera. Coba lagi.')
    } finally {
      setMengambil(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ambil foto nota dengan kamera"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-xl space-y-3 rounded-xl bg-white p-4 shadow-xl">
        <h3 className="text-base font-semibold">Ambil foto nota</h3>

        {keadaan !== 'galat' && (
          <div className="overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => setKeadaan('siap')}
              className="max-h-[60vh] w-full object-contain"
            />
          </div>
        )}

        {keadaan === 'meminta' && (
          <p className="text-sm text-[#6B524B]">
            Menunggu izin kamera. Pilih Izinkan pada pertanyaan di browser.
          </p>
        )}
        {keadaan === 'siap' && (
          <p className="text-sm text-[#6B524B]">
            Posisikan nota di depan kamera sampai tulisannya jelas, lalu tekan Ambil foto.
          </p>
        )}
        {pesan && (
          <p role="alert" className="rounded-lg bg-[#FEF3F2] px-3.5 py-2.5 text-sm text-[#B42318]">
            {pesan}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {keadaan !== 'galat' && (
            <button
              type="button"
              onClick={ambil}
              disabled={keadaan !== 'siap' || mengambil}
              className={`${KELAS_TOMBOL} sm:w-auto`}
            >
              {mengambil ? 'Mengambil...' : 'Ambil foto'}
            </button>
          )}
          <button
            type="button"
            onClick={saatTutup}
            className="rounded-lg border border-[#E6D3C9] px-4 py-2.5 text-sm transition hover:bg-[#FBF7F4]"
          >
            {keadaan === 'galat' ? 'Tutup' : 'Batal'}
          </button>
        </div>
      </div>
    </div>
  )
}
