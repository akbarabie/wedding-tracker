import Link from 'next/link'

// Dua tampilan modul Administrasi: checklist (pelacak status) dan panduan alur
export function TabAdministrasi({ aktif }: { aktif: 'checklist' | 'panduan' }) {
  const tab = [
    { kunci: 'checklist', href: '/administrasi', label: 'Checklist dokumen' },
    { kunci: 'panduan', href: '/administrasi/panduan', label: 'Alur pendaftaran' },
  ] as const

  return (
    <nav
      aria-label="Tampilan administrasi"
      className="flex gap-1 border-b border-[#E8DDD8]"
    >
      {tab.map((t) => (
        <Link
          key={t.kunci}
          href={t.href}
          aria-current={aktif === t.kunci ? 'page' : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
            aktif === t.kunci
              ? 'border-[#9F5C4C] font-medium text-[#9F5C4C]'
              : 'border-transparent text-[#6B524B] hover:text-[#3B2A26]'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
