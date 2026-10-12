import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { todoSchema } from '@/lib/validators/todo'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = todoSchema.partial().safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const todo = await prisma.todo.update({
    where: { id },
    data: {
      ...(parsed.data.title && { title: parsed.data.title }),
      ...(parsed.data.status && { status: parsed.data.status }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      ...(parsed.data.dueDate !== undefined && { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null }),
      ...(parsed.data.assigneeId !== undefined && { assigneeId: parsed.data.assigneeId || null }),
    },
  })
  return NextResponse.json(todo)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  await prisma.todo.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
