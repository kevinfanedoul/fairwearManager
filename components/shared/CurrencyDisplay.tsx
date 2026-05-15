import type { OrderCurrency } from '@/lib/currencies'
import { formatCurrency } from '@/lib/currencies'

interface CurrencyDisplayProps {
  amount: number | string
  currency?: OrderCurrency
  className?: string
}

export function CurrencyDisplay({ amount, currency = 'MAD', className }: CurrencyDisplayProps) {
  return <span className={className}>{formatCurrency(amount, currency)}</span>
}
