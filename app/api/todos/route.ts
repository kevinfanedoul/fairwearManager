import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { todoSchema } from '@/lib/validators/todo'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const todos = await prisma.todo.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: { assignee: { select: { id: true, name: true, color: true } } },
  })
  return NextResponse.json(todos)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const parsed = todoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const todo = await prisma.todo.create({
    data: {
      title: parsed.data.title,
      status: parsed.data.status,
      assigneeId: parsed.data.assigneeId || null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      notes: parsed.data.notes,
      important: parsed.data.important ?? false,
    },
  })
  return NextResponse.json(todo, { status: 201 })
}
