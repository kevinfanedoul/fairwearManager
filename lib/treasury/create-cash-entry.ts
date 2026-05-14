import { prisma } from '@/lib/prisma'

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

type CreateCashEntryInput = {
  date: Date
  label: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  category?: string
  reference?: string
  periodStart?: Date
  periodEnd?: Date
}

export async function createCashEntry(tx: TxClient, input: CreateCashEntryInput) {
  const lastEntry = await tx.cashEntry.findFirst({ orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] })
  const previousBalance = lastEntry ? Number(lastEntry.balance) : 0
  const delta = input.type === 'INCOME' ? input.amount : -input.amount
  const balance = Math.round((previousBalance + delta) * 100) / 100

  return tx.cashEntry.create({
    data: {
      date: input.date,
      label: input.label,
      amount: input.amount,
      type: input.type,
      category: input.category,
      reference: input.reference,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      balance,
    },
  })
}
