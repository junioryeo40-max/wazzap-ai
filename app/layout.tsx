import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChatFlow — Agent WhatsApp IA pour l\'Afrique',
  description: 'Créez votre agent WhatsApp IA en quelques minutes. Service client, vente, FAQ automatisés.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
