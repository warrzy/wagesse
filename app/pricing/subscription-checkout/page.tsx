import { Suspense } from "react"
import CheckoutSubscriptionClient from "@/app/pricing/subscription-checkout/subscription-checkout-client"

export default function SubscriptionCheckoutPage() {
  return (
    <Suspense fallback={<div />}>
      <CheckoutSubscriptionClient />
    </Suspense>
  )
}
