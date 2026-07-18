import { getEnabledVerticals } from '@/registry/loader'
import packageJson from '@/package.json'

export default function HomePage() {
  const verticals = getEnabledVerticals()

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-12 flex items-baseline justify-between border-b border-nexus-border pb-8">
        <div>
          <p className="mono mb-2 text-xs uppercase tracking-[0.2em] text-nexus-muted">
            SAYANJALI NEXUS · v{packageJson.version}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-nexus-text">SYJ Nexus Engine</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-nexus-muted">
            A headless, API-first, configuration-driven enterprise operating framework.
            Bring Your Own Vertical — add an industry by editing a config file, not the code.
          </p>
        </div>
        <span className="mono rounded-full border border-nexus-accent/40 bg-nexus-accent/10 px-3 py-1 text-xs text-nexus-accent">
          engine online
        </span>
      </div>

      <section className="mb-12">
        <h2 className="mono mb-4 text-xs uppercase tracking-[0.2em] text-nexus-muted">
          Registered verticals ({verticals.length})
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {verticals.map((v) => (
            <div key={v.id} className="card p-4">
              <p className="text-sm font-medium text-nexus-text">{v.name}</p>
              <p className="mono mt-1 text-xs text-nexus-muted">{v.id}</p>
              <p className="mt-2 text-xs leading-relaxed text-nexus-muted">{v.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {[
          { label: 'Health', path: '/api/health' },
          { label: 'System status', path: '/api/system' },
          { label: 'Verticals', path: '/api/verticals' },
          { label: 'Docs', path: '/docs' }
        ].map((item) => (
          <a
            key={item.path}
            href={item.path}
            className="card block p-4 text-sm text-nexus-text transition-colors hover:border-nexus-accent/60"
          >
            <span className="mono text-xs text-nexus-muted">{item.path}</span>
            <p className="mt-1 font-medium">{item.label} →</p>
          </a>
        ))}
      </section>

      <footer className="mt-16 border-t border-nexus-border pt-6 text-xs text-nexus-muted">
        Built by SAYANJALI NEXUS PRIVATE LIMITED · MIT Licensed ·{' '}
        <a
          className="underline decoration-nexus-border underline-offset-4 hover:text-nexus-accent"
          href="https://github.com/SHalimoosavi/SYJ-Nexus-Engine"
        >
          github.com/SHalimoosavi/SYJ-Nexus-Engine
        </a>
      </footer>
    </main>
  )
}
