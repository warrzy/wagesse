type TruckOfferCardProps = {
  name: string
  capacity: string
  className?: string
}

export default function TruckOfferCard({ name, capacity, className }: TruckOfferCardProps) {
  return (
    <div className={"rounded-2xl border border-[#071D40]/10 bg-white p-5 text-[#071D40] " + (className ?? "")}>
      <p className="text-sm font-semibold">{name}</p>
      <p className="mt-2 text-sm text-[#071D40]/70">{capacity}</p>
    </div>
  )
}
