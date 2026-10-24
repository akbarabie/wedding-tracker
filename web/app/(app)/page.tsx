import Link from 'next/link'
import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import { ambilRingkasanKategori } from '@/lib/budget/kueri'
import {
  hitungRingkasan,
  tingkatPeringatan,
} from '@/lib/budget/hitung'
import { WARNA_BAR } from '@/lib/budget/warna'
import { ambilTugas } from '@/lib/timeline/kueri'
import {
  faseSaatIni,
  hitungKemajuan,
  sisaHariKeHariH,
  teksHitungMundur,
} from '@/lib/timeline/hitung'
import { LABEL_FASE } from '@/lib/timeline/label'
import { ambilRingkasanTamu } from '@/lib/tamu/kueri'
import { estimasiKonsumsi, ringkasTamu } from '@/lib/tamu/hitung'
import { ambilPengeluaranBelumLunas } from '@/lib/dashboard/kueri'
import {
  JENDELA_JATUH_TEMPO_HARI,
  pembayaranJatuhTempo,
  segmenTamu,
  totalNominal,
  tugasJatuhTempo,
} from '@/lib/dashboard/hitung'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { hariIniWib } from '@/lib/validasi/pernikahan'
import {
  BarisBudgetRingkas,
  BarKehadiran,
  BarKemajuan,
  DaftarPembayaranJatuhTempo,
  DaftarTugasJatuhTempo,
  KartuStat,
} from './_dashboard/komponen'

export default async function HalamanUtama() {
  const { claims, pernikahan } = await wajibPernikahan()
  const nama = claims.user_metadata?.nama ?? claims.email
  const hariIni = hariIniWib()

  // Empat sumber data tidak saling bergantung, jadi dibaca paralel
  const [kategori, tugas, barisTamu, pengeluaran] = await Promise.all([
    ambilRingkasanKategori(pernikahan.id),
    ambilTugas(pernikahan.id),
    ambilRingkasanTamu(pernikahan.id),
    ambilPengeluaranBelumLunas(pernikahan.id),
  ])

  const budget = hitungRingkasan(kategori, pernikahan.budget_total_resepsi)
  const kemajuan = hitungKemajuan(tugas)
  const tamu = ringkasTamu(barisTamu)
  const estimasi = estimasiKonsumsi(tamu)
  const tugasMendesak = tugasJatuhTempo(tugas, hariIni)
  const bayarMendesak = pembayaranJatuhTempo(pengeluaran, hariIni)
  const jumlahMendesak = tugasMendesak.length + bayarMendesak.length
  const adaTerlambat =
    tugasMendesak.some((t) => t.sisaHari < 0) ||
    bayarMendesak.some((p) => p.sisaHari < 0)

  const faseKini = faseSaatIni(pernikahan.tanggal_hari_h, hariIni)
  const sisaHari = sisaHariKeHariH(pernikahan.tanggal_hari_h, hariIni)

  const budgetAda = budget.budgetResepsi > 0
  const persenBudget = budgetAda
    ? Math.round((budget.komitmenResepsi / budget.budgetResepsi) * 100)
    : 0
  const tingkatBudget = tingkatPeringatan(
    budget.komitmenResepsi,
    budget.budgetResepsi
  )

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Halo, {nama}</h1>
        <p className="mt-1 text-sm text-[#6B524B]">
          {pernikahan.nama_pasangan}
          {sisaHari !== null && pernikahan.tanggal_hari_h ? (
            <>
              {' '}
              <span className="font-semibold text-[#9F5C4C]">
                {teksHitungMundur(sisaHari)}
              </span>
              , {formatTanggal(pernikahan.tanggal_hari_h)}
            </>
          ) : (
            <>
              {' '}
              <Link href="/pengaturan" className="text-[#9F5C4C] underline">
                Atur tanggal hari H
              </Link>
            </>
          )}
        </p>
      </div>

      <section
        aria-label="Ringkasan utama"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <KartuStat
          href="/budget"
          judul="Sisa budget resepsi"
          nilai={budgetAda ? formatRupiah(budget.sisaResepsi) : 'Belum diisi'}
          keterangan={
            budgetAda
              ? `dari ${formatRupiah(budget.budgetResepsi)}`
              : 'Isi budget di pengaturan'
          }
          merah={budgetAda && budget.sisaResepsi < 0}
        />
        <KartuStat
          href="/timeline"
          judul="Progres checklist"
          nilai={`${kemajuan.persen}%`}
          keterangan={`${kemajuan.selesai} dari ${kemajuan.total} tugas selesai`}
        />
        <KartuStat
          href="/tamu"
          judul="Tamu hadir"
          nilai={`${tamu.perStatus.hadir.orang} orang`}
          keterangan={`dari ${tamu.orang} orang diundang`}
        />
        <KartuStat
          href="#jatuh-tempo"
          judul={`Jatuh tempo ${JENDELA_JATUH_TEMPO_HARI} hari`}
          nilai={String(jumlahMendesak)}
          keterangan={adaTerlambat ? 'ada yang terlambat' : 'tugas dan pembayaran'}
          merah={adaTerlambat}
        />
      </section>

      <section
        id="jatuh-tempo"
        aria-labelledby="judul-jatuh-tempo"
        className="scroll-mt-4 space-y-3"
      >
        <div>
          <h2 id="judul-jatuh-tempo" className="text-lg font-semibold">
            Jatuh tempo {JENDELA_JATUH_TEMPO_HARI} hari ke depan
          </h2>
          <p className="text-xs text-[#6B524B]">
            Termasuk yang sudah lewat dan belum selesai.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              Tugas ({tugasMendesak.length})
            </h3>
            <DaftarTugasJatuhTempo tugas={tugasMendesak} />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              Pembayaran ({bayarMendesak.length})
              {bayarMendesak.length > 0 && (
                <span className="ml-2 text-xs font-normal text-[#6B524B]">
                  total {formatRupiah(totalNominal(bayarMendesak))}
                </span>
              )}
            </h3>
            <DaftarPembayaranJatuhTempo pembayaran={bayarMendesak} />
          </div>
        </div>
      </section>

      <section aria-labelledby="judul-budget" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="judul-budget" className="text-lg font-semibold">
            Budget
          </h2>
          <Link href="/budget" className="text-sm text-[#9F5C4C] underline">
            Kelola budget
          </Link>
        </div>

        <div className="space-y-2 rounded-xl border border-[#E8DDD8] bg-white p-4">
          {budgetAda ? (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span>
                  {formatRupiah(budget.komitmenResepsi)} disepakati dari{' '}
                  {formatRupiah(budget.budgetResepsi)}
                </span>
                <span className="text-[#6B524B]">
                  {persenBudget}%, dibayar {formatRupiah(budget.dibayarResepsi)}
                </span>
              </div>
              <BarKemajuan
                persen={persenBudget}
                label="Pemakaian budget resepsi"
                warna={WARNA_BAR[tingkatBudget]}
              />
            </>
          ) : (
            <p className="text-sm text-[#6B524B]">
              Budget total resepsi belum diisi, jadi pemakaian total belum bisa
              dihitung.{' '}
              <Link href="/pengaturan" className="text-[#9F5C4C] underline">
                Isi sekarang
              </Link>
            </p>
          )}
        </div>

        {kategori.length === 0 ? (
          <p className="text-sm text-[#6B524B]">Belum ada kategori budget.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Kategori resepsi</h3>
              <ul className="space-y-3">
                {budget.resepsi.map((k) => (
                  <BarisBudgetRingkas key={k.category_id} k={k} />
                ))}
              </ul>
            </div>
            {budget.luar.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Di luar resepsi</h3>
                <ul className="space-y-3">
                  {budget.luar.map((k) => (
                    <BarisBudgetRingkas key={k.category_id} k={k} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section
          aria-labelledby="judul-checklist"
          className="space-y-3 rounded-xl border border-[#E8DDD8] bg-white p-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="judul-checklist" className="text-lg font-semibold">
              Checklist
            </h2>
            <Link href="/timeline" className="text-sm text-[#9F5C4C] underline">
              Buka timeline
            </Link>
          </div>
          {kemajuan.total === 0 ? (
            <p className="text-sm text-[#6B524B]">
              Belum ada tugas. Mulai dari tugas template di halaman Timeline.
            </p>
          ) : (
            <>
              <p className="text-sm">
                <span className="text-2xl font-semibold">{kemajuan.persen}%</span>{' '}
                <span className="text-[#6B524B]">
                  ({kemajuan.selesai} dari {kemajuan.total} tugas selesai)
                </span>
              </p>
              <BarKemajuan persen={kemajuan.persen} label="Progres checklist" />
            </>
          )}
          {faseKini && (
            <p className="text-sm text-[#6B524B]">
              Fase saat ini:{' '}
              <Link
                href={`/timeline#fase-${faseKini}`}
                className="font-medium text-[#9F5C4C] underline"
              >
                Fase {faseKini}
              </Link>
              , {LABEL_FASE[faseKini]}.
            </p>
          )}
        </section>

        <section
          aria-labelledby="judul-tamu"
          className="space-y-3 rounded-xl border border-[#E8DDD8] bg-white p-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="judul-tamu" className="text-lg font-semibold">
              Tamu
            </h2>
            <Link href="/tamu" className="text-sm text-[#9F5C4C] underline">
              Kelola tamu
            </Link>
          </div>
          {tamu.orang === 0 ? (
            <p className="text-sm text-[#6B524B]">
              Belum ada tamu. Tambahkan di halaman Tamu.
            </p>
          ) : (
            <>
              <p className="text-sm">
                <span className="text-2xl font-semibold">
                  {tamu.perStatus.hadir.orang}
                </span>{' '}
                <span className="text-[#6B524B]">
                  orang hadir dari {tamu.orang} orang diundang ({tamu.undangan}{' '}
                  undangan)
                </span>
              </p>
              <BarKehadiran segmen={segmenTamu(tamu)} />
              <p className="text-xs text-[#6B524B]">
                {estimasi.perkiraan === null
                  ? `Batas atas konsumsi ${estimasi.maksimum} orang. Perkiraan muncul setelah ada tamu yang menjawab tegas.`
                  : `Perkiraan konsumsi ${estimasi.perkiraan} orang, antara ${estimasi.pasti} dan ${estimasi.maksimum} orang.`}
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
