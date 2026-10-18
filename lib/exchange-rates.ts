export function roundCurrencyAmount(amount: number) {
  return Math.round(amount * 100) / 100
}

export function roundExchangeRate(rate: number) {
  return Math.round(rate * 1_000_000) / 1_000_000
}
