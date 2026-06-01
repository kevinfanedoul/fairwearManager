import { NextRequest, NextResponse } from 'next/server'
import { Prisma, type InvoiceStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createInvoiceSchema } from '@/lib/validators/invoice'
import { calculateTVA, calculateStampDuty, getVATRateForCurrency } from '@/lib/calculations/invoice'
import { formatInvoiceNumber } from '@/lib/calculations/invoice-number'
import { createClient } from '@/lib/supabase/server'

async function getNextInvoiceNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  year: number
) {
  const invoices = await tx.invoice.findMany({
    where: { number: { endsWith: `/${year}` } },
    select: { number: true },
    orderBy: { createdAt: 'desc' },
  })

  const lastSeq = invoices.reduce((max, invoice) => {
    const parsed = parseInt(invoice.number.replace('PR-', '').split('/')[0], 10)
    return Number.isNaN(parsed) ? max : Math.max(max, parsed)
  }, 0)

  return formatInvoiceNumber(year, lastSeq + 1)
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? undefined
  const clientId = searchParams.get('clientId') ?? undefined
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  const issueDateFilter: { gte?: Date; lt?: Date } = {}

  if (year) {
    const parsedYear = parseInt(year, 10)
    const parsedMonth = month ? parseInt(month, 10) : undefined

    if (!Number.isNaN(parsedYear)) {
      const startDate = parsedMonth && !Number.isNaN(parsedMonth)
        ? new Date(Date.UTC(parsedYear, parsedMonth - 1, 1))
        : new Date(Date.UTC(parsedYear, 0, 1))
      const endDate = parsedMonth && !Number.isNaN(parsedMonth)
        ? new Date(Date.UTC(parsedYear, parsedMonth, 1))
        : new Date(Date.UTC(parsedYear + 1, 0, 1))

      issueDateFilter.gte = startDate
      issueDateFilter.lt = endDate
    }
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(status && { status: status as InvoiceStatus }),
      ...(clientId && { clientId }),
      ...((issueDateFilter.gte || issueDateFilter.lt) && { issueDate: issueDateFilter }),
    },
    orderBy: { issueDate: 'desc' },
    include: {
      client: { select: { id: true, company: true, firstName: true, lastName: true } },
      order: { select: { currency: true } },
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
  const tvaRate = getVATRateForCurrency(order.currency as 'MAD' | 'EUR' | 'GBP' | 'USD')
  const tvaAmount = calculateTVA(totalHT, tvaRate)
  const totalTTCBeforeStamp = totalHT + tvaAmount
  const stampDuty = applyStampDuty ? calculateStampDuty(totalTTCBeforeStamp) : 0
  const totalTTC = Math.round((totalTTCBeforeStamp + stampDuty) * 100) / 100

  const invoice = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
    const existingInvoice = await tx.invoice.findUnique({ where: { orderId } })
    if (existingInvoice) {
      throw new Error('Une facture existe déjà pour cette commande')
    }

    const year = new Date().getFullYear()
    let inv: Awaited<ReturnType<typeof tx.invoice.create>> | null = null

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const number = await getNextInvoiceNumber(tx, year)

      try {
        inv = await tx.invoice.create({
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
        break
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          Array.isArray(error.meta?.target) &&
          error.meta.target.includes('number')
        ) {
          continue
        }

        throw error
      }
    }

    if (!inv) {
      throw new Error('Impossible de générer un numéro de facture unique')
    }

    await tx.order.update({ where: { id: orderId }, data: { status: 'INVOICED' } })
    return inv
  })

  return NextResponse.json(invoice, { status: 201 })
}
