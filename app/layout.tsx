import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "@/styles/globals.css"

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "WAGESSE — Transport de matériaux au Burkina Faso",
  description:
    "Publiez une demande de transport, recevez des devis de camionneurs et suivez la mission. Prix en francs CFA. Coordonnées protégées jusqu'au déblocage.",
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
    <html lang="fr" className={sans.variable}>
      <body className={sans.className} suppressHydrationWarning>{children}</body>
    </html>
  )
}
