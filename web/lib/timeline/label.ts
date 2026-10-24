// Fase persiapan menurut PRD 6.3. Angka fase disimpan di kolom timeline_tasks.fase.
export const DAFTAR_FASE = [1, 2, 3, 4, 5] as const
export type Fase = (typeof DAFTAR_FASE)[number]

// Rentang waktu tiap fase, dihitung mundur dari hari H
export const LABEL_FASE: Record<Fase, string> = {
  1: '12 sampai 9 bulan sebelum hari H',
  2: '8 sampai 6 bulan sebelum hari H',
  3: '5 sampai 3 bulan sebelum hari H',
  4: '2 bulan sampai 1 bulan sebelum hari H',
  5: '2 minggu terakhir sampai hari H',
}

export function adalahFase(nilai: number): nilai is Fase {
  return (DAFTAR_FASE as readonly number[]).includes(nilai)
}

// Status deadline untuk penanda warna di daftar tugas
export type StatusDeadline =
  | 'selesai'
  | 'terlambat'
  | 'segera'
  | 'normal'
  | 'tanpa_deadline'

export const LABEL_STATUS_DEADLINE: Record<StatusDeadline, string> = {
  selesai: 'Selesai',
  terlambat: 'Terlambat',
  segera: 'Segera',
  normal: 'Terjadwal',
  tanpa_deadline: 'Tanpa deadline',
}
