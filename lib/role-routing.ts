export type AppRole = "VISITOR" | "CLIENT" | "TRUCKER" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN" | string

export function getDashboardRouteByRole(role: AppRole | null | undefined): string {
  switch (role) {
    case "TRUCKER":
      return "/dashboard/trucker"
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin"
    case "CLIENT":
    case "OPERATOR":
    case "VISITOR":
    default:
      return "/dashboard/client"
  }
}

export function isAdminRole(role: AppRole | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}
