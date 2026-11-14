import Link from 'next/link'
import {
  DAFTAR_ALUR,
  INFORMASI_TAMBAHAN,
  TAUTAN_SIMKAH,
} from '@/lib/administrasi/panduan'
import { TabAdministrasi } from '../tab-administrasi'

export default function HalamanPanduan() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Administrasi nikah</h1>
        <p className="mt-1 text-sm text-[#6B524B]">
          Urutan mengurus berkas pernikahan dari RT sampai KUA.
        </p>
      </div>

      <TabAdministrasi aktif="panduan" />

      <p className="rounded-xl border border-[#EBD9A8] bg-[#FBF1DC] p-3 text-sm text-[#8A6A22]">
        Panduan ini bersifat umum dan disusun dari referensi pribadi, bukan dari sumber
        resmi. Biaya dan persyaratan dapat berubah, jadi pastikan lagi ke KUA atau Dinas
        setempat sebelum mengurus.
      </p>

      <ol className="space-y-4">
        {DAFTAR_ALUR.map((alur) => (
          <li
            key={alur.nomor}
            className="rounded-xl border border-[#E8DDD8] bg-white p-4 sm:p-6"
          >
            <h2 className="text-lg font-semibold">
              Alur {alur.nomor}: {alur.judul}
            </h2>
            <p className="mt-2 text-sm">{alur.langkah}</p>

            <h3 className="mt-4 text-sm font-semibold">Dokumen yang dibawa</h3>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
              {alur.dokumen.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>

            {alur.catatan && (
              <p className="mt-4 rounded-lg bg-[#FBF7F4] p-3 text-sm text-[#6B524B]">
                <span className="font-medium">Catatan:</span> {alur.catatan}
                {alur.nomor === 4 && (
                  <>
                    {' '}
                    <a
                      href={TAUTAN_SIMKAH}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#9F5C4C] underline"
                    >
                      {TAUTAN_SIMKAH}
                    </a>
                  </>
                )}
              </p>
            )}
          </li>
        ))}
      </ol>

      <section
        aria-labelledby="judul-info-tambahan"
        className="space-y-4 rounded-xl border border-[#E8DDD8] bg-white p-4 sm:p-6"
      >
        <h2 id="judul-info-tambahan" className="text-lg font-semibold">
          Informasi tambahan
        </h2>

        <div>
          <h3 className="text-sm font-semibold">Biaya nikah</h3>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {INFORMASI_TAMBAHAN.biaya.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Dokumen tambahan khusus</h3>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {INFORMASI_TAMBAHAN.dokumenKhusus.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-[#6B524B]">
          <span className="font-medium">Catatan umum:</span>{' '}
          {INFORMASI_TAMBAHAN.catatanUmum}
        </p>
      </section>

      <p className="text-sm">
        Siap melacak berkasnya?{' '}
        <Link href="/administrasi" className="text-[#9F5C4C] underline">
          Buka checklist dokumen
        </Link>
      </p>
    </main>
  )
}
