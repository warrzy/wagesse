"use client"

import Image from "next/image"
import { useState } from "react"

type CatalogImageProps = {
  src: string
  alt: string
  priority?: boolean
  sizes: string
  className?: string
}

export default function CatalogImage({ src, alt, priority, sizes, className }: CatalogImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className={"absolute inset-0 bg-[#071D40] " + (className ?? "")} role="img" aria-label={alt}>
        <span className="sr-only">{alt}</span>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={"object-cover " + (className ?? "")}
      onError={() => setFailed(true)}
    />
  )
}
