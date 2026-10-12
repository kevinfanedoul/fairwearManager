import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { employeeSchema } from '@/lib/validators/employee'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const employees = await prisma.employee.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  })
  return NextResponse.json(employees)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const parsed = employeeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const employee = await prisma.employee.create({
    data: {
      name: parsed.data.name,
      role: parsed.data.role || null,
      hourlyRate: parsed.data.hourlyRate ?? 0,
    },
  })
  return NextResponse.json(employee, { status: 201 })
}
