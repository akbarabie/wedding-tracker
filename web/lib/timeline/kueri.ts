import { createClient } from '@/lib/supabase/server'
import { bandingkanTugas } from './hitung'

export type Tugas = {
  id: string
  judul: string
  fase: number
  deadline: string | null
  selesai: boolean
  penanggung_jawab: string | null
  created_at: string
}

export type Anggota = {
  user_id: string
  peran: 'owner' | 'member'
}

// Semua tugas satu pernikahan, sudah terurut per fase lalu menurut aturan bandingkanTugas.
// Batas 300 tugas di database membuat satu kueri tanpa paginasi tetap ringan.
export async function ambilTugas(weddingId: string): Promise<Tugas[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('timeline_tasks')
    .select('id, judul, fase, deadline, selesai, penanggung_jawab, created_at')
    .eq('wedding_id', weddingId)

  if (error) {
    console.error('[ambilTugas] gagal, kode:', error.code)
    throw new Error('Gagal membaca timeline')
  }

  const daftar = (data ?? []) as Tugas[]
  return daftar.sort((a, b) => a.fase - b.fase || bandingkanTugas(a, b))
}

// Anggota pernikahan, dipakai untuk pilihan penanggung jawab. Nama anggota tidak
// disimpan di tabel yang bisa dibaca aplikasi, jadi tampilannya dibedakan lewat
// "Saya" dan "Pasangan" di sisi halaman.
export async function ambilAnggota(weddingId: string): Promise<Anggota[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('wedding_members')
    .select('user_id, peran')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[ambilAnggota] gagal, kode:', error.code)
    throw new Error('Gagal membaca anggota pernikahan')
  }
  return (data ?? []) as Anggota[]
}
