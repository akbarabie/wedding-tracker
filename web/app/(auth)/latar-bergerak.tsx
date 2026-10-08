'use client'

import { useCallback, useState } from 'react'
import styles from './latar-bergerak.module.css'

// Latar halaman autentikasi. Gradasi bergerak selalu tampil sebagai dasar,
// video pendek di atasnya muncul perlahan begitu siap diputar.
export default function LatarBergerak() {
  const [videoSiap, setVideoSiap] = useState(false)

  // Callback ref berjalan saat elemen video terpasang di halaman.
  // Event canplay bisa terlewat bila video selesai dimuat sebelum React aktif
  // di browser, jadi kesiapan video juga diperiksa langsung lewat readyState.
  const pasangVideo = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return
    // Atribut muted dari React tidak selalu terbaca browser, jadi diatur manual
    video.muted = true
    if (video.readyState >= 3) setVideoSiap(true)
    video.play().catch(() => {
      // Autoplay ditolak browser, gradasi dasar tetap tampil
    })
  }, [])

  return (
    <div aria-hidden="true" className={styles.latar}>
      <div className={`${styles.gumpalan} ${styles.satu}`} />
      <div className={`${styles.gumpalan} ${styles.dua}`} />
      <div className={`${styles.gumpalan} ${styles.tiga}`} />

      <video
        ref={pasangVideo}
        className={`${styles.video} ${videoSiap ? styles.tampil : ''}`}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={() => setVideoSiap(true)}
        onError={() => setVideoSiap(false)}
      >
        <source src="/video/wedding.mp4" type="video/mp4" />
      </video>

      {/* Selubung tipis agar teks dan form tetap terbaca di atas video */}
      <div className={styles.selubung} />
    </div>
  )
}