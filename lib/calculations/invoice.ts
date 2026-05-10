export function calculateTVA(ht: number, rate = 0.2): number {
  return Math.round(ht * rate * 100) / 100
}

export function calculateStampDuty(ttc: number): number {
  const duty = Math.round(ttc * 0.0025 * 100) / 100
  return Math.min(duty, 10000)
}

export function calculateOrderTotals(
  items: { quantity: number; unitPrice: number }[]
): { totalHT: number; tvaAmount: number; totalTTC: number } {
  const totalHT =
    Math.round(
      items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100
    ) / 100
  const tvaAmount = calculateTVA(totalHT)
  const totalTTC = Math.round((totalHT + tvaAmount) * 100) / 100
  return { totalHT, tvaAmount, totalTTC }
}
