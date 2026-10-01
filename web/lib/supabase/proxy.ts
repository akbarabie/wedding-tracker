import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rute yang boleh dibuka tanpa login
const RUTE_PUBLIK = ['/masuk', '/daftar']

// Mengalihkan ke rute lain sambil membawa cookie sesi dan header cache
// dari respons Supabase, supaya token yang baru disegarkan tidak hilang.
function alihkan(
  request: NextRequest,
  responsSupabase: NextResponse,
  tujuan: string
) {
  const url = request.nextUrl.clone()
  url.pathname = tujuan
  url.search = ''

  const respons = NextResponse.redirect(url)
  // Salin cookie sesi satu per satu, karena ResponseCookies tidak punya setAll
  for (const cookie of responsSupabase.cookies.getAll()) {
    respons.cookies.set(cookie)
  }
  for (const header of ['cache-control', 'expires', 'pragma']) {
    const nilai = responsSupabase.headers.get(header)
    if (nilai) respons.headers.set(header, nilai)
  }
  return respons
}

export async function updateSession(request: NextRequest) {
  let responsSupabase = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          responsSupabase = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            responsSupabase.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Jangan menaruh kode apa pun di antara createServerClient dan getClaims.
  // getClaims memverifikasi token sekaligus menyegarkan sesi bila hampir kedaluwarsa.
  const { data } = await supabase.auth.getClaims()
  const sudahLogin = Boolean(data?.claims)

  const path = request.nextUrl.pathname
  const rutePublik = RUTE_PUBLIK.some(
    (rute) => path === rute || path.startsWith(`${rute}/`)
  )

  if (!sudahLogin && !rutePublik) {
    return alihkan(request, responsSupabase, '/masuk')
  }
  if (sudahLogin && rutePublik) {
    return alihkan(request, responsSupabase, '/')
  }

  return responsSupabase
}