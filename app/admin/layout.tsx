import { ReactNode } from "react"
import AdminGuard from "@/app/admin/admin-guard"
import AdminSidebar from "@/app/admin/_components/AdminSidebar"
import AdminTopbar from "@/app/admin/_components/AdminTopbar"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <AdminSidebar />
          <div className="flex-1 min-w-0">
            <AdminTopbar />
            <main className="px-4 sm:px-6 py-8">{children}</main>
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}
