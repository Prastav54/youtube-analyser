export function Navbar() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <span className="size-2.5 rounded-[3px] bg-accent" aria-hidden="true" />
          <span className="text-sm font-medium tracking-tight text-ink">YouTube Analyzer</span>
        </div>
        <p className="text-xs text-muted">Competitor research</p>
      </div>
    </header>
  )
}
