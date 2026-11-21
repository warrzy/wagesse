export function payablePlanCode(plans) {
  if (!Array.isArray(plans)) return null
  const plan = plans.find((item) => {
    if (!item || typeof item.code !== "string" || item.code.length === 0) return false
    const price = Number(item.monthlyPrice)
    return Number.isFinite(price) && price > 0
  })
  return plan ? plan.code : null
}
