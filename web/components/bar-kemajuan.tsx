// Bar kemajuan sederhana dengan atribut aksesibilitas progressbar
export function BarKemajuan({
  persen,
  label,
  warna = 'bg-[#9F5C4C]',
}: {
  persen: number
  label: string
  warna?: string
}) {
  const aman = Math.max(0, Math.min(100, persen))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={aman}
      className="h-2 overflow-hidden rounded-full bg-[#F1E9E5]"
    >
      <div className={`h-full ${warna}`} style={{ width: `${aman}%` }} />
    </div>
  )
}
