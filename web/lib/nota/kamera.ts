// Akses kamera lewat browser untuk perangkat tanpa kamera bawaan pada input berkas,
// terutama laptop dan komputer desktop. Di HP, atribut capture pada input berkas sudah
// membuka aplikasi kamera sistem, jadi jalur ini tidak dipakai di sana.

// Kamera lewat getUserMedia hanya tersedia di HTTPS atau localhost
export function kameraBrowserTersedia(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  )
}

// Layar sentuh sebagai input utama berarti HP atau tablet. Di sana input berkas dengan
// atribut capture membuka kamera sistem yang resolusinya penuh, lebih baik daripada
// kamera di dalam halaman web.
export function perangkatSentuh(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

// Menerjemahkan galat getUserMedia menjadi pesan yang bisa ditindaklanjuti pengguna
export function pesanGalatKamera(e: unknown): string {
  const nama = e instanceof DOMException || e instanceof Error ? e.name : ''
  switch (nama) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Izin kamera ditolak. Izinkan akses kamera di pengaturan browser untuk situs ini, lalu coba lagi.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Kamera tidak ditemukan di perangkat ini. Gunakan tombol pilih dari galeri atau berkas.'
    case 'NotReadableError':
    case 'AbortError':
      return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.'
    default:
      return 'Kamera tidak bisa dibuka. Gunakan tombol pilih dari galeri atau berkas.'
  }
}

// Membuka kamera. Kamera belakang dipilih bila ada (HP), kamera yang tersedia dipakai bila tidak (laptop).
export function bukaKamera(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  })
}

// Mematikan kamera sampai lampu indikatornya padam. Wajib dipanggil saat jendela kamera ditutup.
export function hentikanKamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop())
}

// Mengambil satu gambar dari video kamera menjadi berkas JPEG.
// Tidak dicerminkan, supaya tulisan pada nota tetap terbaca benar.
export function tangkapFrame(video: HTMLVideoElement): Promise<File> {
  return new Promise((selesai, gagal) => {
    const lebar = video.videoWidth
    const tinggi = video.videoHeight
    if (!lebar || !tinggi) {
      gagal(new Error('Kamera belum siap'))
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = lebar
    canvas.height = tinggi
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      gagal(new Error('Canvas tidak tersedia'))
      return
    }
    ctx.drawImage(video, 0, 0, lebar, tinggi)
    canvas.toBlob(
      (blob) =>
        blob
          ? selesai(new File([blob], 'foto-kamera.jpg', { type: 'image/jpeg' }))
          : gagal(new Error('Gagal mengambil gambar')),
      'image/jpeg',
      0.92
    )
  })
}
