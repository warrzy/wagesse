"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiClient, StoredUser } from "@/lib/api-client"

export default function AdminTopbar() {
  const router = useRouter()
  const [me, setMe] = useState<StoredUser | null>(null)

  useEffect(() => {
    setMe(apiClient.getUser())
  }, [])

  const handleLogout = () => {
    apiClient.clearToken()
    router.replace("/auth/login")
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Administration WAGESSE</p>
          <p className="text-xs text-gray-500 truncate">{me ? `${me.phone} — ${me.role}` : ""}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block w-[360px]">
            <input
              placeholder="Recherche globale (utilisateur, annonce, transaction...)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8714D]/40"
            />
          </div>

          <button
            type="button"
            className="px-3 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={() => router.push("/admin/notifications")}
          >
            Notifications
          </button>

          <button
            type="button"
            className="px-3 py-2 rounded-lg text-sm bg-[#E8714D] text-white font-semibold hover:bg-[#d45c39]"
            onClick={handleLogout}
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  )
}
