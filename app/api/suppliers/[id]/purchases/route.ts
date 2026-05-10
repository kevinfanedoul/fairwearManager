import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supplierPurchaseSchema } from '@/lib/validators/cash'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const purchases = await prisma.supplierPurchase.findMany({
    where: { supplierId: id },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(purchases)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = supplierPurchaseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tvaRate, amountHT, stamps } = parsed.data
  const tvaAmount = Math.round(amountHT * tvaRate * 100) / 100
  const totalTTC = Math.round((amountHT + tvaAmount + (stamps ?? 0)) * 100) / 100

  const purchase = await prisma.supplierPurchase.create({
    data: {
      supplierId: id,
      date: new Date(parsed.data.date),
      invoiceNumber: parsed.data.invoiceNumber,
      description: parsed.data.description,
      amountHT,
      tvaRate,
      tvaAmount,
      totalTTC,
      stamps: stamps ?? 0,
      paymentMethod: parsed.data.paymentMethod,
      paymentDate: parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : undefined,
      amountPaid: parsed.data.amountPaid ?? 0,
      notes: parsed.data.notes,
    },
  })

  return NextResponse.json(purchase, { status: 201 })
}
