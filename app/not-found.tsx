import Link from "next/link"
import Header from "@/components/Header"
import Footer from "@/components/Footer"

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="container-max px-4 py-24 text-center">
        <p className="text-sm font-semibold text-[#E8714D]">404</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Cette page n&apos;existe pas</h1>
        <p className="mx-auto mt-3 max-w-md text-gray-600">
          L&apos;adresse demandée ne correspond à aucune page WAGESSE.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-[#1B3A4B] px-5 py-3 text-sm font-semibold text-white"
        >
          Retour à l&apos;accueil
        </Link>
      </main>
      <Footer />
    </>
  )
}
