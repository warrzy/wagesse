"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"

export default function PhoneNotice() {
  const user = apiClient.getUser()
  const [required, setRequired] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/auth/phone-verification")
      .then((response) => response.json())
      .then((body) => {
        if (!cancelled) setRequired(body?.data?.required === true)
      })
      .catch(() => {
        if (!cancelled) setRequired(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!required || !user || user.phoneVerified) return null
  const href = `/auth/verify?phone=${encodeURIComponent(user.phone)}`
  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      Votre numéro n&apos;est pas encore vérifié. Vous pouvez publier une demande et consulter les devis.
      L&apos;achat de crédits, le forfait et le déblocage des contacts attendent le code SMS.{" "}
      <Link href={href} className="font-semibold underline">
        Saisir le code
      </Link>
    </div>
  )
}
