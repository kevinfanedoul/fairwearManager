export function getAppliedPaymentAmount(payment: { appliedAmount?: number | string | null; amount: number | string }) {
  return Number(payment.appliedAmount ?? payment.amount)
}

export function sumAppliedPayments<T extends { appliedAmount?: number | string | null; amount: number | string }>(payments: T[]) {
  return payments.reduce((sum, payment) => sum + getAppliedPaymentAmount(payment), 0)
}
