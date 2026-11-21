import Link from "next/link"

type BrandLogoProps = {
  tone?: "light" | "dark"
  compact?: boolean
  href?: string | null
}

export default function BrandLogo({ tone = "light", compact = false, href = "/" }: BrandLogoProps) {
  const mark = tone === "dark" ? "/brand/mark-light.svg" : "/brand/mark.svg"
  const content = (
    <span className={"inline-flex items-center gap-2.5 " + (tone === "dark" ? "text-white" : "text-[#071D40]")}>
      <img src={mark} alt="" width={40} height={40} className="h-10 w-10 shrink-0" />
      {compact ? (
        <span className="sr-only">WAGESSE</span>
      ) : (
        <span className="text-lg font-semibold tracking-tight">WAGESSE</span>
      )}
    </span>
  )

  if (!href) return content
  return (
    <Link href={href} aria-label="WAGESSE, accueil" className="inline-flex rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087DD1]">
      {content}
    </Link>
  )
}
