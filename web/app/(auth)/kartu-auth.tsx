import type { ReactNode } from 'react'

type PropsKartu = {
  judul: string
  deskripsi: string
  children: ReactNode
}

// Pembungkus kartu kaca dengan judul dan deskripsi, dipakai halaman auth tambahan
export function KartuAuth({ judul, deskripsi, children }: PropsKartu) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-7 shadow-[0_24px_60px_-24px_rgba(159,92,76,0.4)] backdrop-blur-xl sm:p-8">
      <h2 className="text-xl font-semibold tracking-tight">{judul}</h2>
      <p className="mt-1 mb-6 text-sm text-[#6B524B]">{deskripsi}</p>
      {children}
    </div>
  )
}
