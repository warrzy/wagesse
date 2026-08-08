"use client"

import { ReactNode, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { getDashboardRouteByRole, isAdminRole } from "@/lib/role-routing"

export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    const raw = apiClient.getUser()
    const role = raw?.role

    if (isAdminRole(role)) {
      setAllowed(true)
      return
    }

    const token = apiClient.getToken()
    if (!token) {
      router.replace("/auth/login")
      return
    }

    const check = async () => {
      const me = await apiClient.getCurrentUser()
      const meRole = (me.success ? (me.data as any)?.role : null) as any

      if (isAdminRole(meRole)) {
        if (me.success) {
          apiClient.setUser(me.data as any)
        }
        setAllowed(true)
        return
      }

      router.replace(getDashboardRouteByRole(meRole))
    }

    check()
  }, [router])

  if (allowed !== true) return null
  return <>{children}</>
}
