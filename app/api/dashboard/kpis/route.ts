import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const overdueThreshold = subDays(now, 30)

  const [
    monthPayments,
    pendingInvoices,
    activeOrders,
    upcomingDeadlines,
    overdueInvoices,
    recentOrders,
    activeTodos,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ['PENDING', 'PARTIAL'] } },
      include: { payments: true },
    }),
    prisma.order.count({
      where: { status: { in: ['CONFIRMED', 'SOURCING', 'STUDY', 'PRODUCTION', 'READY'] } },
    }),
    prisma.order.findMany({
      where: {
        deadline: { gte: now, lte: in7Days },
        status: { notIn: ['DELIVERED', 'INVOICED', 'PAID', 'CANCELLED'] },
      },
      include: { client: { select: { company: true, firstName: true, lastName: true } } },
      orderBy: { deadline: 'asc' },
    }),
    prisma.invoice.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL'] },
        issueDate: { lte: overdueThreshold },
      },
      include: {
        client: { select: { company: true, firstName: true, lastName: true } },
        payments: true,
      },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { company: true, firstName: true, lastName: true } } },
    }),
    prisma.todo.count({
      where: { status: { in: ['TODO', 'IN_PROGRESS', 'BLOCKED'] } },
    }),
  ])

  const caMonth = Number(monthPayments._sum.amount ?? 0)
  const pendingTotal = pendingInvoices.reduce((sum: number, inv: { totalTTC: unknown, payments: { amount: unknown }[] }) => {
    const paid = inv.payments.reduce((s: number, p: { amount: unknown }) => s + Number(p.amount), 0)
    return sum + Number(inv.totalTTC) - paid
  }, 0)

  return NextResponse.json({
    caMonth,
    pendingInvoicesCount: pendingInvoices.length,
    pendingInvoicesTotal: pendingTotal,
    activeOrdersCount: activeOrders,
    activeTodosCount: activeTodos,
    upcomingDeadlines,
    overdueInvoices,
    recentOrders,
  })
}
