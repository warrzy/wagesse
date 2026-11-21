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
    icon: [
      { url: "/brand/mark.svg", type: "image/svg+xml" },
      { url: "/brand/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/brand/apple-touch.png",
  },
  openGraph: {
    title: "WAGESSE — Transport de matériaux au Burkina Faso",
    description:
      "Publiez une demande de transport, recevez des devis de camionneurs et suivez la mission. Prix en francs CFA.",
    images: ["/brand/mark-512.png"],
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
