import type { OrderCurrency } from '@/lib/currencies'

export const DEFAULT_EXCHANGE_RATES: Record<OrderCurrency, number> = {
  MAD: 1,
  EUR: 10.9,
  GBP: 12.8,
  USD: 10.1,
}

export function roundCurrencyAmount(amount: number) {
  return Math.round(amount * 100) / 100
}

export function roundExchangeRate(rate: number) {
  return Math.round(rate * 1_000_000) / 1_000_000
}

export function convertMadToInvoiceCurrency(
  amountMad: number,
  invoiceCurrency: OrderCurrency,
  rateToMad: number
) {
  if (invoiceCurrency === 'MAD') return roundCurrencyAmount(amountMad)
  if (rateToMad <= 0) return 0
  return roundCurrencyAmount(amountMad / rateToMad)
}
