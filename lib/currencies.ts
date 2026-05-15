export const ORDER_CURRENCIES = {
  MAD: 'Dirham marocain (MAD)',
  EUR: 'Euro (€)',
  GBP: 'Livre sterling (£)',
  USD: 'Dollar américain ($)',
} as const

export type OrderCurrency = keyof typeof ORDER_CURRENCIES

const CURRENCY_LOCALES: Record<OrderCurrency, string> = {
  MAD: 'fr-MA',
  EUR: 'fr-FR',
  GBP: 'en-GB',
  USD: 'en-US',
}

export function formatCurrency(amount: number | string, currency: OrderCurrency = 'MAD') {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount))
}
