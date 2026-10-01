export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-semibold">Wedding Tracker</h1>
        <p className="mb-8 text-center text-sm text-zinc-500">
          Satu tempat untuk seluruh persiapan pernikahanmu
        </p>
        {children}
      </div>
    </main>
  )
}