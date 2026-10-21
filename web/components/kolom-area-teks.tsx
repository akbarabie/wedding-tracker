import { KELAS_INPUT } from './kolom'

type Props = {
  id: string
  label: string
  defaultValue?: string
  galat?: string
  bantuan?: string
  placeholder?: string
  baris?: number
}

// Kolom teks panjang dengan label dan pesan galat, bentuknya mengikuti Kolom
export function KolomAreaTeks({
  id,
  label,
  defaultValue,
  galat,
  bantuan,
  placeholder,
  baris = 4,
}: Props) {
  const idDeskripsi = galat ? `${id}-galat` : bantuan ? `${id}-bantuan` : undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-[#3B2A26]">
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        rows={baris}
        placeholder={placeholder}
        defaultValue={defaultValue}
        aria-invalid={galat ? true : undefined}
        aria-describedby={idDeskripsi}
        className={KELAS_INPUT}
      />
      {galat ? (
        <p id={`${id}-galat`} className="text-xs text-[#B42318]">
          {galat}
        </p>
      ) : bantuan ? (
        <p id={`${id}-bantuan`} className="text-xs text-[#6B524B]">
          {bantuan}
        </p>
      ) : null}
    </div>
  )
}
