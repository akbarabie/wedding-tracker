import type { StatusForm } from '@/lib/validasi/status-form'

// Menampilkan galat umum (merah) atau pesan informasi (hijau) dari Server Action
export function PesanStatus({ status }: { status: StatusForm }) {
  if (status.galat) {
    return (
      <p
        role="alert"
        className="rounded-lg bg-[#FEF3F2] px-3.5 py-2.5 text-sm text-[#B42318]"
      >
        {status.galat}
      </p>
    )
  }

  if (status.info) {
    return (
      <p
        role="status"
        className="rounded-lg bg-[#ECFDF3] px-3.5 py-2.5 text-sm text-[#067647]"
      >
        {status.info}
      </p>
    )
  }

  return null
}
