import { LABEL_STATUS, type StatusPembayaran } from '@/lib/pengeluaran/hitung'

const KELAS: Record<StatusPembayaran, string> = {
  dp_terjadwal: 'bg-[#F1E9E5] text-[#6B524B]',
  dicicil: 'bg-[#F7EBD2] text-[#8A6A22]',
  lunas: 'bg-[#E3F1E6] text-[#2E6B3A]',
}

export function BadgeStatus({ status }: { status: StatusPembayaran }) {
  return (
    <span
      className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${KELAS[status]}`}
    >
      {LABEL_STATUS[status]}
    </span>
  )
}