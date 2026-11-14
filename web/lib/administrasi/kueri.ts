import { createClient } from '@/lib/supabase/server'
import type { Berlaku } from './label'

export type Dokumen = {
  id: string
  judul: string
  berlaku_untuk: Berlaku
  selesai_cpp: boolean
  selesai_cpw: boolean
  catatan: string | null
}

// Semua dokumen satu pernikahan, terurut menurut urutan template lalu waktu dibuat.
// Batas 100 dokumen di database membuat satu kueri tanpa paginasi tetap ringan.
export async function ambilDokumen(weddingId: string): Promise<Dokumen[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('admin_documents')
    .select('id, judul, berlaku_untuk, selesai_cpp, selesai_cpw, catatan')
    .eq('wedding_id', weddingId)
    .order('urutan', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[ambilDokumen] gagal, kode:', error.code)
    throw new Error('Gagal membaca dokumen administrasi')
  }
  return (data ?? []) as Dokumen[]
}
