'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TAUTAN = [
  { href: '/', label: 'Dashboard' },
  { href: '/budget', label: 'Budget' },
  { href: '/vendor', label: 'Vendor' },
  { href: '/pengeluaran', label: 'Pengeluaran' },
  { href: '/timeline', label: 'Timeline' },
  { href: '/tamu', label: 'Tamu' },
]

export function NavUtama() {
  const jalur = usePathname()

  return (
    <nav aria-label="Navigasi utama" className="flex gap-1 overflow-x-auto">
      {TAUTAN.map((t) => {
        const aktif = t.href === '/' ? jalur === '/' : jalur.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={aktif ? 'page' : undefined}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition ${
              aktif
                ? 'bg-[#F4E7E2] font-medium text-[#9F5C4C]'
                : 'text-[#6B524B] hover:bg-[#FBF7F4]'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}