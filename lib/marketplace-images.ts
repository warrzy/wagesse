export type MarketplaceImage = {
  id: string
  src: string
  alt: string
  photographer: string
  source: string
  license: string
  licenseUrl: string
}

const pexels = "https://www.pexels.com/license/"

export const MARKETPLACE_IMAGES: MarketplaceImage[] = [
  {
    id: "benne-carriere",
    src: "/images/marketplace/benne-carriere.jpg",
    alt: "Camion-benne jaune stationné dans une carrière de terre sèche",
    photographer: "Berna",
    source: "https://www.pexels.com/photo/industrial-dump-truck-on-a-dirt-construction-site-28442158/",
    license: "Pexels License",
    licenseUrl: pexels,
  },
  {
    id: "tombereau-granite",
    src: "/images/marketplace/tombereau-granite.jpg",
    alt: "Tombereau chargé de blocs dans une carrière de roche",
    photographer: "Rafael Silva",
    source: "https://www.pexels.com/photo/massive-mining-dump-truck-in-rocky-quarry-39169002/",
    license: "Pexels License",
    licenseUrl: pexels,
  },
  {
    id: "pelle-chargement",
    src: "/images/marketplace/pelle-chargement.jpg",
    alt: "Pelle mécanique chargeant des pierres dans une benne",
    photographer: "Harshal",
    source: "https://www.pexels.com/photo/excavator-unloading-rocks-into-dump-truck-at-quarry-39389821/",
    license: "Pexels License",
    licenseUrl: pexels,
  },
  {
    id: "terrassement",
    src: "/images/marketplace/terrassement.jpg",
    alt: "Chargeuses remplissant une benne sur un terrassement aride",
    photographer: "Ahmed Al-Hilali",
    source: "https://www.pexels.com/photo/excavators-and-truck-with-sand-15439962/",
    license: "Pexels License",
    licenseUrl: pexels,
  },
  {
    id: "piste-chantier",
    src: "/images/marketplace/piste-chantier.jpg",
    alt: "Camions de chantier sur une piste de terre",
    photographer: "Artem Makarov",
    source: "https://www.pexels.com/photo/truck-driving-on-dirt-road-13151135/",
    license: "Pexels License",
    licenseUrl: pexels,
  },
]

export function marketplaceImage(id: string): MarketplaceImage {
  const image = MARKETPLACE_IMAGES.find((item) => item.id === id)
  if (!image) throw new Error(`Image inconnue : ${id}`)
  return image
}
