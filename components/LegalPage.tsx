import type { ReactNode } from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

export default function LegalPage({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <>
      <Header />
      <main className="container-max max-w-3xl py-16">
        <h1 className="text-3xl font-bold text-[#0F172A]">{title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-6 text-gray-700">{children}</div>
      </main>
      <Footer />
    </>
  )
}
