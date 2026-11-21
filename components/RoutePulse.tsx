export default function RoutePulse() {
  return (
    <div className="bg-[#F4F8FC]" aria-hidden="true">
      <svg viewBox="0 0 1200 80" className="h-14 w-full md:h-16">
        <path
          className="route-track"
          d="M48 46C190 46 230 16 380 30s210 42 360 14 250-28 364 16"
          fill="none"
          stroke="#087DD1"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="48" cy="46" r="7" fill="#071D40" />
        <circle cx="1152" cy="46" r="7" fill="#FF7900" />
        <circle className="route-truck" r="6" fill="#FF7900" />
      </svg>
    </div>
  )
}
