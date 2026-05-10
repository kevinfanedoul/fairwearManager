import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      order: { include: { items: true } },
      payments: { orderBy: { date: 'asc' } },
    },
  })
  if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
  return NextResponse.json(invoice)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  if (typeof body.accountingExported === 'boolean') {
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        accountingExported: body.accountingExported,
        accountingExportedAt: body.accountingExported ? new Date() : null,
      },
    })
    return NextResponse.json(invoice)
  }

  return NextResponse.json({ error: 'Modification non autorisée' }, { status: 400 })
}
