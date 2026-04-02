import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Supaflow',
  description: 'Workflow Observability Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-[#0f0f0f] text-white antialiased">
        {children}
      </body>
    </html>
  )
}
