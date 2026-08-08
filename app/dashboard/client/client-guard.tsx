"use client"

import { ReactNode, useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { getDashboardRouteByRole, isAdminRole } from "@/lib/role-routing"

export default function ClientGuard({ children }: { children: ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const raw = apiClient.getUser()
    const role = raw?.role

    if (isAdminRole(role)) {
      router.replace(getDashboardRouteByRole(role))
      return
    }

    const token = apiClient.getToken()
    if (!token) {
      router.replace("/auth/login")
    }
  }, [router])

  return <>{children}</>
}
