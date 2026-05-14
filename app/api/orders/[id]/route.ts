import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

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
  const parsed = updateStatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const existingOrder = await prisma.order.findUnique({
    where: { id },
    select: { status: true },
  })

  if (!existingOrder) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  if (parsed.data.status === 'CANCELLED' && existingOrder.status !== 'QUOTE') {
    return NextResponse.json({ error: 'Seul un devis non confirmé peut être annulé' }, { status: 400 })
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
