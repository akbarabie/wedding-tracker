import Link from 'next/link'
import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import { ambilAnggota, ambilTugas } from '@/lib/timeline/kueri'
import {
  faseSaatIni,
  hitungKemajuan,
  sisaHariKeHariH,
  statusDeadline,
  teksHitungMundur,
} from '@/lib/timeline/hitung'
import { DAFTAR_FASE, LABEL_FASE } from '@/lib/timeline/label'
import { formatTanggal, formatTanggalPendek } from '@/lib/format'
import { hariIniWib } from '@/lib/validasi/pernikahan'
import { BarisTugas } from './baris-tugas'
import { FormTugas, type OpsiPenanggungJawab } from './form-tugas'
import { TombolTemplate } from './tombol-template'

export default async function HalamanTimeline() {
  const { claims, pernikahan } = await wajibPernikahan()

  // Tugas dan anggota tidak saling bergantung, jadi dibaca paralel
  const [tugas, anggota] = await Promise.all([
    ambilTugas(pernikahan.id),
    ambilAnggota(pernikahan.id),
  ])

  const hariIni = hariIniWib()
  const kemajuan = hitungKemajuan(tugas)
  const faseKini = faseSaatIni(pernikahan.tanggal_hari_h, hariIni)
  const sisa = sisaHariKeHariH(pernikahan.tanggal_hari_h, hariIni)

  // Penanggung jawab hanya relevan bila lebih dari satu orang memakai ruang kerja ini.
  // Nama anggota tidak tersedia di tabel yang bisa dibaca aplikasi, jadi dibedakan
  // lewat "Saya" dan "Pasangan".
  const opsiPj: OpsiPenanggungJawab[] =
    anggota.length > 1
      ? anggota.map((a) => ({
          id: a.user_id,
          label: a.user_id === claims.sub ? 'Saya' : 'Pasangan',
        }))
      : []
  const labelPj = new Map(opsiPj.map((o) => [o.id, o.label]))

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Timeline dan checklist</h1>
        <p className="mt-1 text-sm text-[#6B524B]">
          Tugas persiapan dikelompokkan per fase, dihitung mundur dari hari H.
        </p>
      </div>

      <section
        aria-label="Ringkasan progres"
        className="space-y-3 rounded-xl border border-[#E8DDD8] bg-white p-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm">
            <span className="text-2xl font-semibold">{kemajuan.persen}%</span>{' '}
            <span className="text-[#6B524B]">
              ({kemajuan.selesai} dari {kemajuan.total} tugas selesai)
            </span>
          </p>
          {sisa !== null && pernikahan.tanggal_hari_h ? (
            <p className="text-sm text-[#6B524B]">
              <span className="font-semibold text-[#9F5C4C]">{teksHitungMundur(sisa)}</span>
              , {formatTanggal(pernikahan.tanggal_hari_h)}
            </p>
          ) : (
            <p className="text-sm text-[#6B524B]">
              Hari H belum diisi, jadi hitung mundur dan penanda fase berjalan belum tampil.{' '}
              <Link href="/pengaturan" className="text-[#9F5C4C] underline">
                Atur hari H
              </Link>
            </p>
          )}
        </div>
        <div
          role="progressbar"
          aria-label="Progres checklist"
          aria-valuenow={kemajuan.persen}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 rounded-full bg-[#F1E9E5]"
        >
          <div
            className="h-2 rounded-full bg-[#9F5C4C] transition-all"
            style={{ width: `${kemajuan.persen}%` }}
          />
        </div>
        {faseKini && (
          <p className="text-sm text-[#6B524B]">
            Fase saat ini:{' '}
            <a
              href={`#fase-${faseKini}`}
              className="font-medium text-[#9F5C4C] underline"
            >
              Fase {faseKini}
            </a>
            , {LABEL_FASE[faseKini]}.
          </p>
        )}
        {tugas.length > 0 && (
          <TombolTemplate
            varian="sekunder"
            konfirmasi={
              'Tambahkan tugas template per fase?\n\nHanya tugas yang judulnya belum ada yang ditambahkan, tanpa deadline. Tugas yang sudah kamu ubah judulnya akan muncul lagi dengan judul aslinya.'
            }
          />
        )}
      </section>

      <section
        aria-labelledby="judul-tambah-tugas"
        className="rounded-xl border border-[#E8DDD8] bg-white p-4 sm:p-6"
      >
        <h2 id="judul-tambah-tugas" className="mb-4 text-lg font-semibold">
          Tambah tugas
        </h2>
        <FormTugas anggota={opsiPj} awal={{ fase: String(faseKini ?? 1) }} />
      </section>

      {tugas.length === 0 && (
        <div className="space-y-3 rounded-xl border border-dashed border-[#E8DDD8] p-6 text-center">
          <p className="text-sm text-[#6B524B]">
            Belum ada tugas. Tambahkan sendiri lewat form di atas, atau mulai dari daftar
            tugas standar per fase yang bisa kamu ubah atau hapus kapan saja.
          </p>
          <div className="flex justify-center">
            <TombolTemplate varian="utama" />
          </div>
        </div>
      )}

      {DAFTAR_FASE.map((fase) => {
        const daftar = tugas.filter((t) => t.fase === fase)
        const { total, selesai } = kemajuan.perFase[fase]
        // Fase kosong tetap tampil bila sedang berjalan, supaya pengguna tahu
        // fase mana yang sedang dikerjakan walau belum ada tugasnya
        if (daftar.length === 0 && faseKini !== fase) return null

        return (
          <section
            key={fase}
            id={`fase-${fase}`}
            aria-labelledby={`judul-fase-${fase}`}
            // scroll-mt memberi jarak di atas saat dilompati dari tautan Fase saat ini
            className={`scroll-mt-4 space-y-3 ${
              faseKini === fase
                ? 'rounded-2xl border border-[#E7C9C0] bg-[#FBF1EE] p-4'
                : ''
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id={`judul-fase-${fase}`} className="text-lg font-semibold">
                  Fase {fase}
                  {faseKini === fase && (
                    <span className="ml-2 rounded-full bg-[#F4E7E2] px-2.5 py-0.5 align-middle text-xs font-medium text-[#9F5C4C]">
                      Sedang berjalan
                    </span>
                  )}
                </h2>
                <p className="text-xs text-[#6B524B]">{LABEL_FASE[fase]}</p>
              </div>
              <p className="text-xs text-[#6B524B]">
                {selesai} dari {total} selesai
              </p>
            </div>

            {daftar.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#E8DDD8] p-4 text-center text-sm text-[#6B524B]">
                Belum ada tugas di fase ini.
              </p>
            ) : (
              <ul className="space-y-2">
                {daftar.map((t) => (
                  <BarisTugas
                    key={t.id}
                    tugas={{
                      id: t.id,
                      judul: t.judul,
                      fase: t.fase,
                      deadline: t.deadline,
                      selesai: t.selesai,
                      penanggungJawab: t.penanggung_jawab,
                    }}
                    status={statusDeadline(t, hariIni)}
                    labelDeadline={t.deadline ? formatTanggalPendek(t.deadline) : null}
                    labelPenanggungJawab={
                      t.penanggung_jawab ? (labelPj.get(t.penanggung_jawab) ?? null) : null
                    }
                    anggota={opsiPj}
                  />
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </main>
  )
}
