import { ReactNode } from "react"
import TruckerDock from "@/components/TruckerDock"

export default function TruckerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pb-24 lg:pb-0">
      {children}
      <TruckerDock />
    </div>
  )
}
