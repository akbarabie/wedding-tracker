import { createClient } from '@/lib/supabase/server'
import type { PengeluaranBelumLunas } from './hitung'

// Pengeluaran final yang belum lunas beserta cicilannya. Pengeluaran lunas dilewati
// karena semua cicilannya pasti sudah dibayar: total cicilan tidak boleh melebihi
// nominal, dan status lunas berarti total yang dibayar sudah mencapai nominal.
// Draf hasil ekstraksi nota tidak ikut karena belum masuk laporan.
// Penyaringan cicilan yang jatuh tempo dilakukan di aplikasi (pembayaranJatuhTempo),
// karena jumlah pengeluaran belum lunas pada satu pernikahan kecil.
export async function ambilPengeluaranBelumLunas(
  weddingId: string
): Promise<PengeluaranBelumLunas[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select(
      'id, deskripsi, vendors(nama), payments(id, label, nominal, jatuh_tempo, dibayar_pada)'
    )
    .eq('wedding_id', weddingId)
    .eq('status_entri', 'final')
    .neq('status_pembayaran', 'lunas')

  if (error) {
    console.error('[ambilPengeluaranBelumLunas] gagal, kode:', error.code)
    throw new Error('Gagal membaca pembayaran yang belum lunas')
  }
  return (data ?? []) as unknown as PengeluaranBelumLunas[]
}
