import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  if (order.status !== 'QUOTE') {
    return NextResponse.json({ error: 'Seul un devis peut être confirmé' }, { status: 400 })
  }

  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({ where: { id }, data: { status: 'CONFIRMED' } }),
    prisma.productionPlan.create({ data: { orderId: id } }),
  ])

  return NextResponse.json(updatedOrder)
}
