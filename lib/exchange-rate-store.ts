import { prisma } from '@/lib/prisma'
import { DEFAULT_EXCHANGE_RATES, roundExchangeRate } from '@/lib/exchange-rates'
import { ORDER_CURRENCY_CODES, type OrderCurrency } from '@/lib/currencies'

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
type ExchangeRateRecord = { currency: string; rateToMad: unknown }
type ExchangeRateDelegate = {
  upsert: (args: {
    where: { currency: string }
    update: Record<string, never>
    create: { currency: string; rateToMad: number }
  }) => Promise<unknown>
  findMany: () => Promise<ExchangeRateRecord[]>
}

function getExchangeRateDelegate(tx: TxClient | typeof prisma): ExchangeRateDelegate | null {
  const candidate = tx as unknown as { exchangeRate?: ExchangeRateDelegate }
  return candidate.exchangeRate ?? null
}

export async function ensureExchangeRates(tx: TxClient | typeof prisma = prisma) {
  const exchangeRateDelegate = getExchangeRateDelegate(tx)
  if (!exchangeRateDelegate) return false

  await Promise.all(
    ORDER_CURRENCY_CODES.map((currency) =>
      exchangeRateDelegate.upsert({
        where: { currency },
        update: {},
        create: {
          currency,
          rateToMad: DEFAULT_EXCHANGE_RATES[currency],
        },
      })
    )
  )

  return true
}

export async function getExchangeRateMap(tx: TxClient | typeof prisma = prisma): Promise<Record<OrderCurrency, number>> {
  const exchangeRateDelegate = getExchangeRateDelegate(tx)
  if (!exchangeRateDelegate) {
    return { ...DEFAULT_EXCHANGE_RATES }
  }

  await ensureExchangeRates(tx)
  const rates = await exchangeRateDelegate.findMany()

  return ORDER_CURRENCY_CODES.reduce((acc, currency) => {
    const rate = rates.find((entry) => entry.currency === currency)
    acc[currency] = roundExchangeRate(Number(rate?.rateToMad ?? DEFAULT_EXCHANGE_RATES[currency]))
    return acc
  }, {} as Record<OrderCurrency, number>)
}
