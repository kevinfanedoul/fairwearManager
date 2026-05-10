import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createInvoiceSchema } from '@/lib/validators/invoice'
import { calculateTVA, calculateStampDuty } from '@/lib/calculations/invoice'
import { formatInvoiceNumber } from '@/lib/calculations/invoice-number'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? undefined

  const invoices = await prisma.invoice.findMany({
    where: { ...(status && { status: status as any }) },
    orderBy: { issueDate: 'desc' },
    include: {
      client: { select: { id: true, company: true, firstName: true, lastName: true } },
      payments: true,
    },
  })

  return NextResponse.json(invoices)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const parsed = createInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { orderId, dueDate, applyStampDuty, notes } = parsed.data

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { client: true, invoice: true },
  })
  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  if (order.invoice) return NextResponse.json({ error: 'Une facture existe déjà pour cette commande' }, { status: 400 })

  const totalHT = Number(order.totalHT)
  const tvaRate = 0.20
  const tvaAmount = calculateTVA(totalHT, tvaRate)
  const totalTTCBeforeStamp = totalHT + tvaAmount
  const stampDuty = applyStampDuty ? calculateStampDuty(totalTTCBeforeStamp) : 0
  const totalTTC = Math.round((totalTTCBeforeStamp + stampDuty) * 100) / 100

  const year = new Date().getFullYear()
  const lastInvoice = await prisma.invoice.findFirst({
    where: { number: { endsWith: `/${year}` } },
    orderBy: { number: 'desc' },
  })
  const lastSeq = lastInvoice
    ? parseInt(lastInvoice.number.replace('PR-', '').split('/')[0])
    : 0
  const number = formatInvoiceNumber(year, lastSeq + 1)

  const invoice = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
    const inv = await tx.invoice.create({
      data: {
        number,
        clientId: order.clientId,
        orderId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        totalHT,
        tvaRate,
        tvaAmount,
        stampDuty,
        totalTTC,
        notes,
      },
    })
    await tx.order.update({ where: { id: orderId }, data: { status: 'INVOICED' } })
    return inv
  })

  return NextResponse.json(invoice, { status: 201 })
}
