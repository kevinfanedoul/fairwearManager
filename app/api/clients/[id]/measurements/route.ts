import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { measurementSchema } from '@/lib/validators/client'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const measurement = await prisma.measurement.findUnique({ where: { clientId: id } })
  return NextResponse.json(measurement)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = measurementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const measurement = await prisma.measurement.upsert({
    where: { clientId: id },
    update: parsed.data,
    create: { clientId: id, ...parsed.data },
  })
  return NextResponse.json(measurement)
}
