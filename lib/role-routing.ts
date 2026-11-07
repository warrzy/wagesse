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

/** Après connexion ou inscription, l'espace du rôle s'ouvre.
 * La vérification du numéro reste exigée seulement pour les opérations payantes. */
export function destinationAfterAuthentication(role: AppRole | null | undefined): string {
  return getDashboardRouteByRole(role)
}
