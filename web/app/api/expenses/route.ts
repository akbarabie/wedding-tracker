import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ambilPernikahanAktif } from '@/lib/pernikahan/kueri'
import { ambilDaftarPengeluaran } from '@/lib/pengeluaran/kueri'
import { susunCsv } from '@/lib/pengeluaran/csv'
import { bacaFilter } from '@/lib/validasi/filter-pengeluaran'

// Tanggal hari ini menurut waktu Jakarta untuk nama berkas, format YYYY-MM-DD
function tanggalHariIni(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(
    new Date()
  )
}

function galat(pesan: string, status: number) {
  return Response.json({ galat: pesan }, { status })
}

// Ekspor laporan pengeluaran ke CSV, mengikuti filter yang sama dengan halaman daftar.
// Proxy sudah menolak pengguna belum login dengan 401, pengecekan di sini adalah
// lapisan kedua, dan RLS di database menjadi lapisan ketiga.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    if (!data?.claims) return galat('Belum masuk', 401)

    const pernikahan = await ambilPernikahanAktif()
    if (!pernikahan) return galat('Pernikahan belum dibuat', 404)

    const filter = bacaFilter(Object.fromEntries(request.nextUrl.searchParams))
    const daftar = await ambilDaftarPengeluaran(pernikahan.id, filter)

    return new Response(susunCsv(daftar), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="pengeluaran-${tanggalHariIni()}.csv"`,
        // Data keuangan pribadi, jangan disimpan di cache bersama
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e) {
    console.error('[GET /api/expenses] gagal:', e instanceof Error ? e.message : e)
    return galat('Gagal membuat berkas CSV', 500)
  }
}
