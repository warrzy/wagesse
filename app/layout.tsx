import type { Metadata } from "next"
import "@/styles/globals.css"

export const metadata: Metadata = {
  title: "Wagesse - Marketplace de Fret Burkina Faso",
  description: "Trouvez un camion fiable pour votre chantier en quelques minutes. Publiez votre besoin, recevez des profils de camionneurs vérifiés et payez en toute simplicité.",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
