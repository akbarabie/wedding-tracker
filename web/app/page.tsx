import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { keluar } from '@/app/(auth)/actions'

export default async function HalamanUtama() {
  const supabase = await createClient()

  // getClaims memverifikasi tanda tangan token, bukan sekadar membaca cookie
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect('/masuk')

  const nama = data.claims.user_metadata?.nama ?? data.claims.email

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Halo, {nama}</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Kamu sudah masuk. Dashboard akan dibangun di tahap berikutnya.
      </p>
      <form action={keluar} className="mt-8">
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Keluar
        </button>
      </form>
    </main>
  )
}