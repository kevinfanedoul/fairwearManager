interface CurrencyDisplayProps {
  amount: number | string
  className?: string
}

export function CurrencyDisplay({ amount, className }: CurrencyDisplayProps) {
  const formatted = new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount))

  return <span className={className}>{formatted} MAD</span>
}
