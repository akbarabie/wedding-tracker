import { LABEL_STATUS_VENDOR, type StatusVendor } from '@/lib/vendor/label'

const WARNA: Record<StatusVendor, string> = {
  disurvei: 'bg-[#F1E9E5] text-[#6B524B]',
  dihubungi: 'bg-[#EAF1F8] text-[#27527A]',
  negosiasi: 'bg-[#FBF1DC] text-[#8A6A22]',
  deal: 'bg-[#E6F3E8] text-[#2E6B3A]',
  ditolak: 'bg-[#FEF3F2] text-[#B42318]',
}

export function BadgeStatusVendor({ status }: { status: StatusVendor }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${WARNA[status]}`}
    >
      {LABEL_STATUS_VENDOR[status]}
    </span>
  )
}
