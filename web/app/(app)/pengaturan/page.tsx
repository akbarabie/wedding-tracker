import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import { hariIniWib } from '@/lib/validasi/pernikahan'
import { FormPengaturan } from './form-pengaturan'

export default async function HalamanPengaturan() {
  const { pernikahan } = await wajibPernikahan()
  const hariIni = hariIniWib()

  // Pemilih tanggal hanya dibatasi bila hari H tersimpan belum lewat atau masih kosong.
  // Bila sudah lewat, batas dibuang supaya tanggal tersimpan tidak tampak tidak sah.
  const tanggalPalingAwal =
    !pernikahan.tanggal_hari_h || pernikahan.tanggal_hari_h >= hariIni
      ? hariIni
      : undefined

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pengaturan pernikahan</h1>
        <p className="mt-1 text-sm text-[#6B524B]">
          Data dasar yang dipakai di seluruh aplikasi. Perubahan berlaku untuk semua
          orang yang berbagi ruang kerja ini.
        </p>
      </div>

      <section
        aria-labelledby="judul-data-dasar"
        className="rounded-xl border border-[#E8DDD8] bg-white p-4 sm:p-6"
      >
        <h2 id="judul-data-dasar" className="mb-4 text-lg font-semibold">
          Data dasar
        </h2>
        {/* key membuat form dibuat ulang saat data tersimpan berubah, supaya nilai
            awalnya selalu sama dengan isi database */}
        <FormPengaturan
          key={`${pernikahan.nama_pasangan}|${pernikahan.tanggal_hari_h}|${pernikahan.budget_total_resepsi}`}
          awal={{
            namaPasangan: pernikahan.nama_pasangan,
            tanggalHariH: pernikahan.tanggal_hari_h ?? '',
            budgetTotal: String(Math.trunc(Number(pernikahan.budget_total_resepsi))),
          }}
          tanggalPalingAwal={tanggalPalingAwal}
        />
      </section>

      <p className="text-xs text-[#6B524B]">
        Mengubah hari H menggeser hitung mundur dan penanda fase berjalan. Deadline tugas
        yang sudah kamu isi tidak ikut berubah.
      </p>
    </main>
  )
}
