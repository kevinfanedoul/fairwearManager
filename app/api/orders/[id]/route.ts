import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { orderSchema } from '@/lib/validators/order'
import { calculateOrderTotalsFromPrices, calculateStudyGradationTotal, calculateStudyLineTotal } from '@/lib/calculations/invoice'

const updateStatusSchema = z.object({
  status: z.enum(['QUOTE','CONFIRMED','SOURCING','STUDY','PRODUCTION','READY','DELIVERED','INVOICED','PAID','CANCELLED']),
  notes: z.string().optional(),
  deadline: z.string().datetime().optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      client: true,
      items: true,
      production: true,
      invoice: { include: { payments: true } },
    },
  })
  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  return NextResponse.json(order)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const existingOrder = await prisma.order.findUnique({
    where: { id },
    select: { status: true },
  })

  if (!existingOrder) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  if ('status' in body) {
    const parsed = updateStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    if (parsed.data.status === 'CANCELLED' && existingOrder.status !== 'QUOTE') {
      return NextResponse.json({ error: 'Seul un devis non confirmé peut être annulé' }, { status: 400 })
    }

    if (parsed.data.status === 'QUOTE' && existingOrder.status !== 'CANCELLED') {
      return NextResponse.json({ error: 'Seul un devis annulé peut être réouvert' }, { status: 400 })
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: parsed.data.status,
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
        ...(parsed.data.deadline && { deadline: new Date(parsed.data.deadline) }),
      },
    })
    return NextResponse.json(order)
  }

  if (existingOrder.status !== 'QUOTE') {
    return NextResponse.json({ error: 'Seul un devis non confirmé peut être modifié' }, { status: 400 })
  }

  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { type, items, clientId, currency, fabricSupply, deadline, notes } = parsed.data
  const itemsWithTotals = items.map((item) => {
    if (item.kind === 'FLAT') {
      return { ...item, totalPrice: item.flatPrice ?? 0 }
    }

    if (type === 'STUDY') {
      const gradationTotal = calculateStudyGradationTotal(item)
      const totalPrice = calculateStudyLineTotal({ ...item, gradationTotal })
      return { ...item, gradationTotal, totalPrice }
    }

    return { ...item, totalPrice: Math.round(item.quantity * item.unitPrice * 100) / 100 }
  })
  const totalPrices = itemsWithTotals.map((item) => item.totalPrice)
  const { totalHT, totalTTC } = calculateOrderTotalsFromPrices(totalPrices, currency)

  const order = await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: id } })

    return tx.order.update({
      where: { id },
      data: {
        clientId,
        type,
        currency,
        fabricSupply,
        deadline: deadline ? new Date(deadline) : null,
        notes,
        totalHT,
        totalTTC,
        items: { create: itemsWithTotals },
      },
      include: { items: true },
    })
  })

  return NextResponse.json(order)
}
