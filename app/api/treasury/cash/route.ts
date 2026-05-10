import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cashEntrySchema } from '@/lib/validators/cash'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const entries = await prisma.cashEntry.findMany({
    where: {
      ...(from && { date: { gte: new Date(from) } }),
      ...(to && { date: { lte: new Date(to) } }),
    },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json(entries)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const parsed = cashEntrySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const lastEntry = await prisma.cashEntry.findFirst({ orderBy: { date: 'desc' } })
  const previousBalance = lastEntry ? Number(lastEntry.balance) : 0
  const delta = parsed.data.type === 'INCOME' ? parsed.data.amount : -parsed.data.amount
  const balance = Math.round((previousBalance + delta) * 100) / 100

  const entry = await prisma.cashEntry.create({
    data: {
      date: new Date(parsed.data.date),
      label: parsed.data.label,
      amount: parsed.data.amount,
      type: parsed.data.type,
      category: parsed.data.category,
      reference: parsed.data.reference,
      balance,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
