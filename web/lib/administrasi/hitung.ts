import type { Berlaku, PihakDokumen } from './label'

export type DokumenHitung = {
  berlaku_untuk: Berlaku
  selesai_cpp: boolean
  selesai_cpw: boolean
}

// Apakah dokumen ini berlaku untuk pihak tertentu
export function berlakuUntukPihak(berlaku: Berlaku, pihak: PihakDokumen): boolean {
  return berlaku === 'keduanya' || berlaku === pihak
}

type Kemajuan = { selesai: number; total: number; persen: number }

export type KemajuanAdministrasi = {
  cpp: Kemajuan
  cpw: Kemajuan
  keseluruhan: Kemajuan
  // True bila ada dokumen dan semua yang berlaku sudah selesai di kedua pihak
  lengkap: boolean
}

function susun(selesai: number, total: number): Kemajuan {
  return {
    selesai,
    total,
    // Tanpa dokumen yang berlaku dianggap 0 persen, bukan 100
    persen: total === 0 ? 0 : Math.round((selesai / total) * 100),
  }
}

// Progres per pihak dan keseluruhan. Sel yang tidak berlaku tidak dihitung, jadi dokumen
// khusus satu pihak tidak menurunkan persentase pihak lainnya.
export function hitungKemajuanAdministrasi(
  dokumen: DokumenHitung[]
): KemajuanAdministrasi {
  let totalCpp = 0
  let selesaiCpp = 0
  let totalCpw = 0
  let selesaiCpw = 0

  for (const d of dokumen) {
    if (berlakuUntukPihak(d.berlaku_untuk, 'cpp')) {
      totalCpp += 1
      if (d.selesai_cpp) selesaiCpp += 1
    }
    if (berlakuUntukPihak(d.berlaku_untuk, 'cpw')) {
      totalCpw += 1
      if (d.selesai_cpw) selesaiCpw += 1
    }
  }

  const total = totalCpp + totalCpw
  const selesai = selesaiCpp + selesaiCpw
  return {
    cpp: susun(selesaiCpp, totalCpp),
    cpw: susun(selesaiCpw, totalCpw),
    keseluruhan: susun(selesai, total),
    lengkap: total > 0 && selesai === total,
  }
}
