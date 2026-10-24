import type { ReactNode } from 'react'
import Link from 'next/link'
import { keluar } from '@/app/(auth)/actions'
import { NavUtama } from './nav-utama'

export default function LayoutAplikasi({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FBF7F4] text-[#3B2A26]">
      <header className="border-b border-[#E8DDD8] bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <span className="text-sm font-semibold text-[#9F5C4C]">
            Wedding Tracker
          </span>
          {/* Enam tautan tidak muat sebaris di layar sempit, jadi nav turun ke baris sendiri */}
          <div className="order-last w-full min-w-0 sm:order-none sm:w-auto">
            <NavUtama />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/pengaturan"
              className="rounded-md px-3 py-1.5 text-sm text-[#6B524B] hover:bg-[#FBF7F4]"
            >
              Pengaturan
            </Link>
            <form action={keluar}>
              <button
                type="submit"
                className="rounded-md border border-[#E8DDD8] px-3 py-1.5 text-sm hover:bg-[#FBF7F4]"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
    </div>
  )
}