import { NextRequest, NextResponse } from 'next/server'
import { type OrderStatus, type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { orderSchema } from '@/lib/validators/order'
import { calculateOrderTotalsFromPrices, calculateStudyGradationTotal, calculateStudyLineTotal } from '@/lib/calculations/invoice'
import { formatOrderReference, orderReferencePrefix } from '@/lib/calculations/order-reference'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? undefined
  const clientId = searchParams.get('clientId') ?? undefined
  const sortBy = searchParams.get('sortBy') ?? 'date'
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

  const orderByMap: Record<string, Prisma.OrderOrderByWithRelationInput[]> = {
    reference: [{ reference: sortOrder }],
    client: [{ client: { company: sortOrder } }, { client: { lastName: sortOrder } }],
    status: [{ status: sortOrder }],
    date: [{ orderDate: sortOrder }],
    deadline: [{ deadline: sortOrder }],
    totalTTC: [{ totalTTC: sortOrder }],
  }

  const orders = await prisma.order.findMany({
    where: {
      ...(status && { status: status as OrderStatus }),
      ...(clientId && { clientId }),
    },
    orderBy: orderByMap[sortBy] ?? orderByMap.date,
    include: {
      client: { select: { id: true, company: true, firstName: true, lastName: true } },
      items: true,
    },
  })

  return NextResponse.json(orders)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { type, items, clientId, currency, deadline, notes } = parsed.data

  const year = new Date().getFullYear()
  const prefix = `${orderReferencePrefix(type)}-${year}-`
  const lastOrder = await prisma.order.findFirst({
    where: { type, reference: { startsWith: prefix } },
    orderBy: { reference: 'desc' },
  })
  const lastSeq = lastOrder ? parseInt(lastOrder.reference.split('-').pop() ?? '0', 10) : 0
  const reference = formatOrderReference(type, year, lastSeq + 1)

  const itemsWithTotals = items.map((item) => {
    if (type === 'STUDY') {
      if (item.kind === 'FLAT') {
        return { ...item, totalPrice: item.flatPrice ?? 0 }
      }

      const gradationTotal = calculateStudyGradationTotal(item)
      const totalPrice = calculateStudyLineTotal({ ...item, gradationTotal })
      return { ...item, gradationTotal, totalPrice }
    }

    return { ...item, totalPrice: Math.round(item.quantity * item.unitPrice * 100) / 100 }
  })
  const totalPrices = itemsWithTotals.map((item) => item.totalPrice)
  const { totalHT, totalTTC } = calculateOrderTotalsFromPrices(totalPrices, currency)

  const order = await prisma.order.create({
    data: {
      reference,
      clientId,
      type,
      currency,
      deadline: deadline ? new Date(deadline) : undefined,
      notes,
      totalHT,
      totalTTC,
      items: { create: itemsWithTotals },
    },
    include: { items: true },
  })

  return NextResponse.json(order, { status: 201 })
}
