export function formatInvoiceNumber(year: number, sequence: number): string {
  return `PR-${String(sequence).padStart(3, '0')}/${year}`
}

export function parseInvoiceYear(number: string): number {
  const match = number.match(/\/(\d{4})$/)
  return match ? parseInt(match[1]) : new Date().getFullYear()
}
