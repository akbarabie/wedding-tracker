import Image from 'next/image'
import { Plus_Jakarta_Sans } from 'next/font/google'
import LatarBergerak from './latar-bergerak'

const fontUtama = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap' })

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${fontUtama.className} relative min-h-dvh overflow-hidden bg-[#FFF8F3] text-[#3B2A26] [color-scheme:light]`}
    >
      <LatarBergerak />

      <main className="relative z-10 mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-10">
        <section className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <h1>
            <Image
              src="/logo-lengkap.png"
              alt="Wedding Tracker"
              width={720}
              height={626}
              priority
              className="h-auto w-44 sm:w-56 lg:w-[22rem]"
            />
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-[#6B524B] lg:mt-6">
            Anggaran, vendor, jadwal, dan daftar tamu untuk hari bahagiamu, semua dalam satu tempat.
          </p>
        </section>

        <section className="w-full max-w-md justify-self-center lg:justify-self-end">
          {children}
        </section>
      </main>
    </div>
  )
}