import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { TodoStatus } from '@prisma/client'

const reorderSchema = z.object({
  columns: z.record(
    z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']),
    z.array(z.string())
  ),
})

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const columns = parsed.data.columns

  try {
    await prisma.$transaction(async (tx) => {
      for (const [status, ids] of Object.entries(columns)) {
        for (let i = 0; i < ids.length; i++) {
          await tx.todo.update({
            where: { id: ids[i] },
            data: { status: status as TodoStatus, sortOrder: i },
          })
        }
      }
    })
  } catch (error) {
    console.error('Erreur lors du réordonnancement des tâches', error)
    return NextResponse.json({ error: 'Impossible de réordonner les tâches' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
