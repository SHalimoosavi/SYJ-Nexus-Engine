import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SYJ Nexus Engine',
  description:
    'A headless, API-first, configuration-driven enterprise operating framework. Bring Your Own Vertical.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
