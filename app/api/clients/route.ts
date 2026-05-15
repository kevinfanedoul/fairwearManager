import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { clientSchema } from '@/lib/validators/client'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const type = searchParams.get('type') ?? undefined
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const sortBy = searchParams.get('sortBy') ?? 'name'
  const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc'

  const where = {
    active: true,
    ...(type && { type: type as any }),
    ...(search && {
      OR: [
        { company: { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const orderByMap: Record<string, Prisma.ClientOrderByWithRelationInput[]> = {
    name: [{ company: sortOrder }, { lastName: sortOrder }, { firstName: sortOrder }],
    type: [{ type: sortOrder }, { company: 'asc' }, { lastName: 'asc' }],
    email: [{ email: sortOrder }, { company: 'asc' }, { lastName: 'asc' }],
    city: [{ city: sortOrder }, { company: 'asc' }, { lastName: 'asc' }],
    orders: [{ orders: { _count: sortOrder } }, { company: 'asc' }, { lastName: 'asc' }],
  }

  const orderBy = orderByMap[sortBy] ?? orderByMap.name

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { orders: true, invoices: true } },
      },
    }),
    prisma.client.count({ where }),
  ])

  return NextResponse.json({ clients, total, page, limit, sortBy, sortOrder })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const parsed = clientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const client = await prisma.client.create({ data: parsed.data })
  return NextResponse.json(client, { status: 201 })
}
