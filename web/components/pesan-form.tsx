import type { StatusForm } from '@/lib/validasi/status-form'

// Menampilkan galat umum atau pesan sukses dari Server Action
export function PesanForm({ status }: { status: StatusForm }) {
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
      <p role="status" className="text-sm text-[#2E6B3A]">
        {status.info}
      </p>
    )
  }
  return null
}