export const LABEL_STATUS = {
  dp_terjadwal: 'DP terjadwal',
  dicicil: 'Dicicil',
  lunas: 'Lunas',
} as const

export type StatusPembayaran = keyof typeof LABEL_STATUS

// Menghitung posisi pembayaran sebuah pengeluaran dari daftar cicilannya
export function hitungPembayaran(
  nominal: number,
  cicilan: { nominal: number; dibayar_pada: string | null }[]
) {
  const dijadwalkan = cicilan.reduce((t, c) => t + c.nominal, 0)
  const dibayar = cicilan
    .filter((c) => c.dibayar_pada !== null)
    .reduce((t, c) => t + c.nominal, 0)

  return {
    dijadwalkan,
    dibayar,
    sisaBayar: nominal - dibayar,
    belumDijadwalkan: nominal - dijadwalkan,
    persenDibayar:
      nominal > 0 ? Math.min(100, Math.round((dibayar / nominal) * 100)) : 0,
  }
}