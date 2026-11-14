import Link from 'next/link'
import { wajibPernikahan } from '@/lib/pernikahan/sesi'
import { ambilDokumen } from '@/lib/administrasi/kueri'
import { hitungKemajuanAdministrasi } from '@/lib/administrasi/hitung'
import { TombolTemplate } from '@/components/tombol-template'
import { BarKemajuan } from '@/components/bar-kemajuan'
import { BarisDokumen } from './baris-dokumen'
import { FormDokumen } from './form-dokumen'
import { TabAdministrasi } from './tab-administrasi'
import { isiTemplateAdministrasi } from './actions'

function KartuPihak({
  judul,
  selesai,
  total,
  persen,
}: {
  judul: string
  selesai: number
  total: number
  persen: number
}) {
  return (
    <div className="rounded-xl border border-[#E8DDD8] bg-white p-3">
      <p className="text-xs text-[#6B524B]">{judul}</p>
      <p className="text-2xl font-semibold">{persen}%</p>
      <p className="mb-2 text-xs text-[#6B524B]">
        {selesai} dari {total} dokumen
      </p>
      <BarKemajuan persen={persen} label={`Progres ${judul}`} />
    </div>
  )
}

export default async function HalamanAdministrasi() {
  const { pernikahan } = await wajibPernikahan()
  const dokumen = await ambilDokumen(pernikahan.id)
  const kemajuan = hitungKemajuanAdministrasi(dokumen)

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Administrasi nikah</h1>
        <p className="mt-1 text-sm text-[#6B524B]">
          Pantau kelengkapan berkas calon pengantin pria (CPP) dan wanita (CPW) satu
          per satu.
        </p>
      </div>

      <TabAdministrasi aktif="checklist" />

      <section aria-label="Ringkasan kelengkapan berkas" className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <KartuPihak judul="CPP" {...kemajuan.cpp} />
          <KartuPihak judul="CPW" {...kemajuan.cpw} />
          <KartuPihak judul="Keseluruhan" {...kemajuan.keseluruhan} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E8DDD8] bg-white p-3 text-sm">
          <p>
            Status keseluruhan:{' '}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                kemajuan.lengkap
                  ? 'bg-[#E6F3E8] text-[#2E6B3A]'
                  : 'bg-[#FBF1DC] text-[#8A6A22]'
              }`}
            >
              {kemajuan.lengkap ? 'Sudah lengkap' : 'Belum lengkap'}
            </span>
          </p>
          <Link
            href="/administrasi/panduan"
            className="text-sm text-[#9F5C4C] underline"
          >
            Lihat alur pendaftaran
          </Link>
        </div>
        {dokumen.length > 0 && (
          <TombolTemplate
            aksi={isiTemplateAdministrasi}
            label="Tambahkan dokumen template"
            varian="sekunder"
            konfirmasi={
              'Tambahkan dokumen template berkas nikah?\n\nHanya dokumen yang namanya belum ada yang ditambahkan. Dokumen template yang sudah kamu ubah namanya akan muncul lagi dengan nama aslinya.'
            }
          />
        )}
      </section>

      <section
        aria-labelledby="judul-tambah-dokumen"
        className="rounded-xl border border-[#E8DDD8] bg-white p-4 sm:p-6"
      >
        <h2 id="judul-tambah-dokumen" className="mb-4 text-lg font-semibold">
          Tambah dokumen
        </h2>
        <FormDokumen />
      </section>

      {dokumen.length === 0 ? (
        <div className="space-y-3 rounded-xl border border-dashed border-[#E8DDD8] p-6 text-center">
          <p className="text-sm text-[#6B524B]">
            Belum ada dokumen. Tambahkan sendiri lewat form di atas, atau mulai dari
            daftar 21 dokumen umum untuk pendaftaran nikah di KUA. Isinya bisa kamu
            ubah atau hapus kapan saja, dan persyaratan tiap daerah bisa berbeda.
          </p>
          <div className="flex justify-center">
            <TombolTemplate
              aksi={isiTemplateAdministrasi}
              label="Mulai dari template"
              varian="utama"
            />
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {dokumen.map((d) => (
            <BarisDokumen
              key={d.id}
              dokumen={{
                id: d.id,
                judul: d.judul,
                berlakuUntuk: d.berlaku_untuk,
                selesaiCpp: d.selesai_cpp,
                selesaiCpw: d.selesai_cpw,
                catatan: d.catatan,
              }}
            />
          ))}
        </ul>
      )}
    </main>
  )
}
