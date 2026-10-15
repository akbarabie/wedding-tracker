'use client'

import { useEffect, useRef } from 'react'

type OpsiTurnstile = {
  sitekey: string
  callback: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
  language?: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact' | 'flexible'
}

type ApiTurnstile = {
  render: (wadah: HTMLElement, opsi: OpsiTurnstile) => string
  reset: (idWidget: string) => void
  remove: (idWidget: string) => void
}

declare global {
  interface Window {
    turnstile?: ApiTurnstile
  }
}

const URL_SKRIP =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// Memuat skrip Turnstile satu kali saja, berapa pun jumlah form yang memakainya
function muatSkrip(): Promise<void> {
  return new Promise((selesai, gagal) => {
    if (window.turnstile) return selesai()

    const skripAda = document.querySelector<HTMLScriptElement>(
      `script[src="${URL_SKRIP}"]`
    )
    const skrip = skripAda ?? document.createElement('script')
    skrip.addEventListener('load', () => selesai())
    skrip.addEventListener('error', () =>
      gagal(new Error('Skrip Turnstile gagal dimuat'))
    )

    if (!skripAda) {
      skrip.src = URL_SKRIP
      skrip.async = true
      document.head.appendChild(skrip)
    }
  })
}

type PropsTurnstile = {
  // Berubah setiap kali Server Action selesai, dipakai sebagai tanda untuk
  // meminta token baru karena token lama hanya bisa dipakai satu kali.
  kunciReset?: unknown
}

// Menampilkan kotak verifikasi Turnstile dan mengisi token ke input tersembunyi
// bernama cf-turnstile-response, yang ikut terkirim bersama form.
export function Turnstile({ kunciReset }: PropsTurnstile) {
  const wadah = useRef<HTMLDivElement>(null)
  const inputToken = useRef<HTMLInputElement>(null)
  const idWidget = useRef<string | null>(null)

  useEffect(() => {
    const kunciSitus = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!kunciSitus) {
      console.error('[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY belum diatur')
      return
    }

    let dibatalkan = false

    muatSkrip()
      .then(() => {
        if (dibatalkan || !wadah.current || !window.turnstile) return
        idWidget.current = window.turnstile.render(wadah.current, {
          sitekey: kunciSitus,
          callback: (token) => {
            if (inputToken.current) inputToken.current.value = token
          },
          'expired-callback': () => {
            if (inputToken.current) inputToken.current.value = ''
          },
          'error-callback': () => {
            if (inputToken.current) inputToken.current.value = ''
          },
          language: 'id',
          theme: 'light',
          size: 'flexible',
        })
      })
      .catch(() => {
        console.error('[turnstile] skrip gagal dimuat')
      })

    return () => {
      dibatalkan = true
      if (idWidget.current && window.turnstile) {
        window.turnstile.remove(idWidget.current)
      }
      idWidget.current = null
    }
  }, [])

  // Token lama sudah terpakai oleh pengiriman sebelumnya, jadi minta yang baru
  useEffect(() => {
    if (idWidget.current && window.turnstile) {
      if (inputToken.current) inputToken.current.value = ''
      window.turnstile.reset(idWidget.current)
    }
  }, [kunciReset])

  return (
    <div>
      <div ref={wadah} className="min-h-[65px]" />
      <input type="hidden" name="cf-turnstile-response" ref={inputToken} />
    </div>
  )
}
