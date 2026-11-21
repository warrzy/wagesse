import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { BRAND_CONFIG } from "@/lib/config"

const whatsapp = BRAND_CONFIG.social.whatsapp
const whatsappReady = whatsapp.startsWith("https://wa.me/226") && !whatsapp.includes("x")

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#F5F4F0] pt-16 pb-20">
        <div className="container-max max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight text-[#13283A]">Contact</h1>
          <p className="mt-4 text-gray-600">
            Une question sur un transport, un forfait ou un règlement ? Écrivez à l&apos;équipe {BRAND_CONFIG.name}.
          </p>
          <div className="mt-8 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p>
              <span className="font-semibold text-[#13283A]">E-mail : </span>
              <a className="text-[#ED8A25] font-semibold" href={`mailto:${BRAND_CONFIG.social.email}`}>
                {BRAND_CONFIG.social.email}
              </a>
            </p>
            {whatsappReady ? (
              <p>
                <span className="font-semibold text-[#13283A]">WhatsApp : </span>
                <a className="font-semibold text-[#ED8A25]" href={whatsapp}>
                  Ouvrir la conversation
                </a>
              </p>
            ) : null}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
