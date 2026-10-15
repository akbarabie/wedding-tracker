import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ambilPernikahanAktif } from '@/lib/pernikahan/kueri'

// Dipanggil di awal setiap halaman yang butuh login dan pernikahan aktif.
// cache() membuat pembacaan hanya terjadi sekali per request, walaupun
// dipanggil dari beberapa komponen.
export const wajibPernikahan = cache(async () => {
  const supabase = await createClient()
  // getClaims memverifikasi tanda tangan token tanpa perjalanan jaringan ekstra
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect('/masuk')

  const pernikahan = await ambilPernikahanAktif()
  if (!pernikahan) redirect('/mulai')

  return { claims: data.claims, pernikahan }
})