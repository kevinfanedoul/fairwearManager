import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const order = await prisma.order.findUnique({ where: { id }, include: { client: true } })
  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  if (order.status !== 'QUOTE') {
    return NextResponse.json({ error: 'Seul un devis peut être confirmé' }, { status: 400 })
  }

  const typeLabel = order.type === 'STUDY' ? "Bureau d'études" : 'Production'
  const clientName =
    order.client.company ||
    [order.client.firstName, order.client.lastName].filter(Boolean).join(' ')
  const taskTitle = clientName
    ? `${typeLabel} — ${clientName} — ${order.reference}`
    : `${typeLabel} — ${order.reference}`

  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({ where: { id }, data: { status: 'CONFIRMED' } }),
    prisma.productionPlan.create({ data: { orderId: id } }),
    prisma.todo.create({
      data: {
        title: taskTitle,
        status: 'TODO',
        dueDate: order.deadline ?? undefined,
      },
    }),
  ])

  return NextResponse.json(updatedOrder)
}
