import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { employeeSchema } from '@/lib/validators/employee'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = employeeSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.role !== undefined && { role: parsed.data.role || null }),
      ...(parsed.data.hourlyRate !== undefined && { hourlyRate: parsed.data.hourlyRate }),
      ...(parsed.data.active !== undefined && { active: parsed.data.active }),
    },
  })
  return NextResponse.json(employee)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  await prisma.employee.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
