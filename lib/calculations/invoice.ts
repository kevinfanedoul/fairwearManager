import type { OrderCurrency } from '@/lib/currencies'

export function getVATRateForCurrency(currency: OrderCurrency): number {
  return currency === 'MAD' ? 0.2 : 0
}

export function shouldApplyMoroccanVAT(currency: OrderCurrency): boolean {
  return getVATRateForCurrency(currency) > 0
}

export function calculateTVA(ht: number, rate = 0.2): number {
  return Math.round(ht * rate * 100) / 100
}

export function calculateStampDuty(ttc: number): number {
  const duty = Math.round(ttc * 0.0025 * 100) / 100
  return Math.min(duty, 10000)
}

export function calculateOrderTotals(
  items: { quantity: number; unitPrice: number }[],
  currency: OrderCurrency = 'MAD'
): { totalHT: number; tvaAmount: number; totalTTC: number } {
  const totalHT =
    Math.round(
      items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100
    ) / 100
  const tvaAmount = calculateTVA(totalHT, getVATRateForCurrency(currency))
  const totalTTC = Math.round((totalHT + tvaAmount) * 100) / 100
  return { totalHT, tvaAmount, totalTTC }
}

export function calculateStudyGradationTotal(
  item: { gradationSizes?: number | null; gradationUnitPrice?: number | null }
): number {
  return Math.round((item.gradationSizes ?? 0) * (item.gradationUnitPrice ?? 0) * 100) / 100
}

export function calculateStudyLineTotal(
  item: { patronage?: number | null; proto?: number | null; gradationTotal?: number | null }
): number {
  const patronage = item.patronage ?? 0
  const proto = item.proto ?? 0
  const gradationTotal = item.gradationTotal ?? 0
  return Math.round((patronage + proto + gradationTotal) * 100) / 100
}

export function calculateOrderTotalsFromPrices(
  totalPrices: number[],
  currency: OrderCurrency = 'MAD'
): { totalHT: number; tvaAmount: number; totalTTC: number } {
  const totalHT = Math.round(totalPrices.reduce((sum, price) => sum + price, 0) * 100) / 100
  const tvaAmount = calculateTVA(totalHT, getVATRateForCurrency(currency))
  const totalTTC = Math.round((totalHT + tvaAmount) * 100) / 100
  return { totalHT, tvaAmount, totalTTC }
}
