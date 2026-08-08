import { Suspense } from "react"
import CheckoutClient from "./checkout-client"

export default function CreditCheckoutPage() {
  return (
    <Suspense fallback={<div />}> 
      <CheckoutClient />
    </Suspense>
  )
}
