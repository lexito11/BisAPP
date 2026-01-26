import type { Metadata } from 'next'
import './globals.css'
import NotificationManager from '@/components/NotificationManager'

export const metadata: Metadata = {
  title: 'BisAPP - Seguimiento de Iglesias',
  description: 'Aplicación de seguimiento para iglesias',
  manifest: '/manifest.json',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#4F46E5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NotificationManager />
        {children}
      </body>
    </html>
  )
}
