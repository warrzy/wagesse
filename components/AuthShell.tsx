"use client"

import Image from "next/image"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { marketplaceImage } from "@/lib/marketplace-images"
import { ReactNode } from "react"

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  const photo = marketplaceImage("benne-carriere")

  return (
    <>
      <Header />
      <main className="bg-[#F5F4F0]">
        <div className="container-max grid items-center gap-8 py-10 lg:grid-cols-2 lg:py-16">
          <div className="relative hidden min-h-[560px] overflow-hidden rounded-[2rem] lg:block">
            <Image src={photo.src} alt={photo.alt} fill priority sizes="50vw" className="object-cover object-left" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#13283A] via-[#13283A]/20 to-transparent" />
            <p className="absolute bottom-8 left-8 right-8 text-3xl font-semibold leading-tight text-white">
              Un compte. Un numéro. Le chantier peut avancer.
            </p>
          </div>
          <div className="mx-auto w-full max-w-md rounded-[2rem] border border-[#13283A]/10 bg-white p-6 shadow-[0_16px_50px_rgba(19,40,58,0.06)] sm:p-8">
            <h1 className="text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-[#13283A]/70">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
