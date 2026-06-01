import { z } from 'zod'

export const exchangeRateSchema = z.object({
  currency: z.enum(['EUR', 'GBP', 'USD']),
  rateToMad: z.number().positive('Le taux doit être positif'),
})

export const exchangeRateListSchema = z.object({
  rates: z.array(exchangeRateSchema).min(1),
})

export type ExchangeRateInput = z.infer<typeof exchangeRateSchema>
export type ExchangeRateListInput = z.infer<typeof exchangeRateListSchema>
