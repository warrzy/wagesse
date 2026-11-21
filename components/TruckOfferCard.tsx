type TruckOfferCardProps = {
  name: string
  capacity: string
  className?: string
}

export default function TruckOfferCard({ name, capacity, className }: TruckOfferCardProps) {
  return (
    <div className={"rounded-2xl border border-[#13283A]/10 bg-white p-5 text-[#13283A] " + (className ?? "")}>
      <p className="text-sm font-semibold">{name}</p>
      <p className="mt-2 text-sm text-[#13283A]/70">{capacity}</p>
    </div>
  )
}
