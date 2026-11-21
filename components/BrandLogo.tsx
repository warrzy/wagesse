import Link from "next/link"

type BrandLogoProps = {
  tone?: "light" | "dark"
  compact?: boolean
  href?: string | null
}

export default function BrandLogo({ tone = "light", compact = false, href = "/" }: BrandLogoProps) {
  const src = compact ? "/brand/mark.png" : tone === "dark" ? "/brand/logo-dark.png" : "/brand/logo.png"
  const content = (
    <img
      src={src}
      alt="WAGESSE"
      width={compact ? 64 : 148}
      height={compact ? 64 : 112}
      className={compact ? "h-10 w-10 object-contain" : "h-14 w-auto object-contain sm:h-16"}
    />
  )

  if (!href) return content
  return (
    <Link href={href} className="inline-flex rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087DD1]">
      {content}
    </Link>
  )
}
