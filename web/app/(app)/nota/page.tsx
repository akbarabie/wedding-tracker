import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import { ambilNotaTerbaru } from '@/lib/nota/kueri'
import { KELAS_STATUS_NOTA, LABEL_STATUS_NOTA, masihBerjalan } from '@/lib/nota/label'
import { formatWaktuWib } from '@/lib/format'
import { ekstensiDariPath } from '@/lib/nota/gambar'
import { FormUnggahNota } from './form-unggah'
import { PemantauStatus } from './pemantau-status'

export default async function HalamanNota() {
  const { pernikahan } = await wajibPernikahan()
  const { nota, urlGambar } = await ambilNotaTerbaru(pernikahan.id)
  const adaBerjalan = nota.some((n) => masihBerjalan(n.status_proses))

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nota belanja</h1>
        <p className="mt-1 text-sm text-[#6B524B]">
          Unggah foto nota atau kuitansi. Isinya dibaca otomatis menjadi draf pengeluaran
          yang kamu periksa dulu sebelum tercatat.
        </p>
      </div>

      <section
        aria-labelledby="judul-unggah"
        className="space-y-4 rounded-xl border border-[#E8DDD8] bg-white p-4 sm:p-6"
      >
        <h2 id="judul-unggah" className="text-lg font-semibold">
          Unggah nota
        </h2>
        <FormUnggahNota />
        <p className="text-xs text-[#6B524B]">
          Format yang didukung: JPG, JPEG, PNG, WEBP, HEIC, dan PDF. Foto dan PDF berukuran
          besar diperkecil otomatis di perangkatmu sebelum diunggah, jadi tidak perlu
          dikompres sendiri. PDF yang terlalu besar diubah menjadi gambar dari maksimal 3
          halaman pertamanya. Foto dibersihkan dari data lokasi, lalu disimpan privat dan
          hanya bisa dibuka oleh anggota pernikahan ini.
        </p>
      </section>

      <section aria-labelledby="judul-riwayat" className="space-y-3">
        <h2 id="judul-riwayat" className="text-lg font-semibold">
          Unggahan terbaru
        </h2>

        {nota.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E8DDD8] p-6 text-center text-sm text-[#6B524B]">
            Belum ada nota yang diunggah.
          </div>
        ) : (
          <ul className="space-y-2">
            {nota.map((n) => {
              const url = urlGambar[n.path_gambar]
              return (
                <li
                  key={n.id}
                  className="flex items-center gap-3 rounded-xl border border-[#E8DDD8] bg-white p-3"
                >
                  {url ? (
                    // next/image tidak dipakai karena pengoptimal gambar akan menyimpan
                    // salinan gambar privat ini di cache, padahal signed URL berumur singkat.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt="Gambar kecil nota"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="size-14 shrink-0 rounded-md border border-[#E8DDD8] object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex size-14 shrink-0 items-center justify-center rounded-md border border-[#E8DDD8] bg-[#F3EEEC] text-xs font-semibold text-[#7A6A64]"
                    >
                      {ekstensiDariPath(n.path_gambar).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm text-[#6B524B]">{formatWaktuWib(n.created_at)}</p>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${KELAS_STATUS_NOTA[n.status_proses]}`}
                    >
                      {LABEL_STATUS_NOTA[n.status_proses]}
                    </span>
                    {n.status_proses === 'gagal' && n.pesan_galat && (
                      <p className="text-xs text-[#B42318]">{n.pesan_galat}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <PemantauStatus aktif={adaBerjalan} />
    </main>
  )
}
