// Untuk siapa sebuah dokumen administrasi berlaku. Nilainya sama dengan CHECK di migrasi 17.
export const DAFTAR_BERLAKU = ['keduanya', 'cpp', 'cpw'] as const
export type Berlaku = (typeof DAFTAR_BERLAKU)[number]

export const LABEL_BERLAKU: Record<Berlaku, string> = {
  keduanya: 'CPP dan CPW',
  cpp: 'Hanya CPP (calon pengantin pria)',
  cpw: 'Hanya CPW (calon pengantin wanita)',
}

export const DAFTAR_PIHAK_DOKUMEN = ['cpp', 'cpw'] as const
export type PihakDokumen = (typeof DAFTAR_PIHAK_DOKUMEN)[number]

export const LABEL_PIHAK_DOKUMEN: Record<PihakDokumen, string> = {
  cpp: 'CPP',
  cpw: 'CPW',
}

export function adalahBerlaku(nilai: string): nilai is Berlaku {
  return (DAFTAR_BERLAKU as readonly string[]).includes(nilai)
}
