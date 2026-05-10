import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supplierSchema } from '@/lib/validators/cash'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const suppliers = await prisma.supplier.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    include: { _count: { select: { purchases: true } } },
  })
  return NextResponse.json(suppliers)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const parsed = supplierSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }
  const supplier = await prisma.supplier.create({ data: parsed.data })
  return NextResponse.json(supplier, { status: 201 })
}
