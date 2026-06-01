import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { calculateStampDuty, calculateTVA } from '@/lib/calculations/invoice'
import { formatCreditNoteNumber } from '@/lib/calculations/credit-note-number'
import { deriveInvoiceStatus } from '@/lib/calculations/invoice-status'
import { createCreditNoteSchema } from '@/lib/validators/invoice'

async function getNextCreditNoteNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  year: number
) {
  const creditNotes = await tx.creditNote.findMany({
    where: { number: { endsWith: `/${year}` } },
    select: { number: true },
    orderBy: { createdAt: 'desc' },
  })

  const lastSeq = creditNotes.reduce((max, creditNote) => {
    const parsed = parseInt(creditNote.number.replace('AV-', '').split('/')[0], 10)
    return Number.isNaN(parsed) ? max : Math.max(max, parsed)
  }, 0)

  return formatCreditNoteNumber(year, lastSeq + 1)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = createCreditNoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      payments: true,
      creditNotes: { include: { items: true } },
      order: { include: { items: true } },
    },
  })

  if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  if (parsed.data.mode === 'RETURN_ITEMS' && !invoice.order) {
    return NextResponse.json({ error: 'Avoir indisponible sans commande source' }, { status: 400 })
  }
  if (invoice.status === 'CANCELLED') return NextResponse.json({ error: 'Facture annulée' }, { status: 400 })

  const creditedByOrderItemId = new Map<string, { quantity: number; sizeS: number; sizeM: number; sizeL: number; sizeXL: number; sizeTU: number }>()

  invoice.creditNotes.forEach((creditNote) => {
    creditNote.items.forEach((item) => {
      if (!item.orderItemId) return
      const current = creditedByOrderItemId.get(item.orderItemId) ?? { quantity: 0, sizeS: 0, sizeM: 0, sizeL: 0, sizeXL: 0, sizeTU: 0 }
      creditedByOrderItemId.set(item.orderItemId, {
        quantity: current.quantity + item.quantity,
        sizeS: current.sizeS + item.sizeS,
        sizeM: current.sizeM + item.sizeM,
        sizeL: current.sizeL + item.sizeL,
        sizeXL: current.sizeXL + item.sizeXL,
        sizeTU: current.sizeTU + item.sizeTU,
      })
    })
  })

  const normalizedItems = parsed.data.items.map((item) => {
    if (parsed.data.mode === 'FREE_AMOUNT') {
      const totalPrice = Math.round(item.quantity * item.unitPrice * 100) / 100

      return {
        orderItemId: null,
        designation: item.designation,
        sizeS: 0,
        sizeM: 0,
        sizeL: 0,
        sizeXL: 0,
        sizeTU: 0,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice,
        notes: item.notes,
      }
    }

    const sourceItem = invoice.order?.items.find((orderItem) => orderItem.id === item.orderItemId)
    if (!sourceItem) {
      throw new Error(`Ligne source introuvable pour ${item.designation}`)
    }

    const alreadyCredited = creditedByOrderItemId.get(item.orderItemId!) ?? { quantity: 0, sizeS: 0, sizeM: 0, sizeL: 0, sizeXL: 0, sizeTU: 0 }
    const remainingBySize = {
      sizeS: sourceItem.sizeS - alreadyCredited.sizeS,
      sizeM: sourceItem.sizeM - alreadyCredited.sizeM,
      sizeL: sourceItem.sizeL - alreadyCredited.sizeL,
      sizeXL: sourceItem.sizeXL - alreadyCredited.sizeXL,
      sizeTU: sourceItem.sizeTU - alreadyCredited.sizeTU,
    }

    if (
      item.sizeS > remainingBySize.sizeS ||
      item.sizeM > remainingBySize.sizeM ||
      item.sizeL > remainingBySize.sizeL ||
      item.sizeXL > remainingBySize.sizeXL ||
      item.sizeTU > remainingBySize.sizeTU
    ) {
      throw new Error(`Retour supérieur aux quantités facturées pour ${sourceItem.designation}`)
    }

    const remainingQuantity = sourceItem.quantity - alreadyCredited.quantity
    if (item.quantity > remainingQuantity) {
      throw new Error(`Quantité retournée trop élevée pour ${sourceItem.designation}`)
    }

    const totalPrice = Math.round(item.quantity * item.unitPrice * 100) / 100

    return {
      orderItemId: sourceItem.id,
      designation: item.designation,
      sizeS: item.sizeS,
      sizeM: item.sizeM,
      sizeL: item.sizeL,
      sizeXL: item.sizeXL,
      sizeTU: item.sizeTU,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice,
      notes: item.notes,
    }
  })

  const totalHT = Math.round(normalizedItems.reduce((sum, item) => sum + item.totalPrice, 0) * 100) / 100
  if (totalHT <= 0) {
    return NextResponse.json({ error: 'Le montant de l’avoir doit être positif' }, { status: 400 })
  }

  const tvaRate = Number(invoice.tvaRate)
  const tvaAmount = calculateTVA(totalHT, tvaRate)
  const totalTTCBeforeStamp = totalHT + tvaAmount
  const stampDuty = parsed.data.applyStampDuty ? calculateStampDuty(totalTTCBeforeStamp) : 0
  const totalTTC = Math.round((totalTTCBeforeStamp + stampDuty) * 100) / 100
  const previousCredits = invoice.creditNotes.reduce((sum, creditNote) => sum + Number(creditNote.totalTTC), 0)

  if (Math.round((previousCredits + totalTTC) * 100) / 100 > Number(invoice.totalTTC)) {
    return NextResponse.json({ error: 'Le total des avoirs ne peut pas dépasser le montant de la facture' }, { status: 400 })
  }

  try {
    const creditNote = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      const year = new Date(parsed.data.issueDate).getFullYear()
      let createdCreditNote: Awaited<ReturnType<typeof tx.creditNote.create>> | null = null

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const number = await getNextCreditNoteNumber(tx, year)

        try {
          createdCreditNote = await tx.creditNote.create({
            data: {
              number,
              invoiceId: id,
              issueDate: new Date(parsed.data.issueDate),
              reason: parsed.data.reason,
              totalHT,
              tvaRate,
              tvaAmount,
              stampDuty,
              totalTTC,
              notes: parsed.data.notes,
              items: { create: normalizedItems },
            },
            include: { items: true },
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

      if (!createdCreditNote) {
        throw new Error('Impossible de générer un numéro d’avoir unique')
      }

      const totalApplied = invoice.payments.reduce((sum, payment) => {
        return sum + Number(payment.appliedAmount ?? payment.amount)
      }, 0)
      const nextStatus = deriveInvoiceStatus(Number(invoice.totalTTC), totalApplied, previousCredits + totalTTC, invoice.dueDate)

      await tx.invoice.update({
        where: { id },
        data: { status: nextStatus },
      })

      if (invoice.orderId) {
        await tx.order.update({
          where: { id: invoice.orderId },
          data: { status: nextStatus === 'PAID' ? 'PAID' : 'INVOICED' },
        })
      }

      return createdCreditNote
    })

    return NextResponse.json(creditNote, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la création de l’avoir'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
