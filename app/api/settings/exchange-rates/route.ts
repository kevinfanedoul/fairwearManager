import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getExchangeRateMap, ensureExchangeRates } from '@/lib/exchange-rate-store'
import { exchangeRateListSchema } from '@/lib/validators/exchange-rates'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const rates = await getExchangeRateMap()
  return NextResponse.json({ rates })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()
  const parsed = exchangeRateListSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const exchangeRateTableAvailable = await ensureExchangeRates(prisma)
  if (!exchangeRateTableAvailable) {
    return NextResponse.json(
      { error: 'Les taux de change ne sont pas encore disponibles. Appliquez la migration Prisma puis redémarrez le serveur.' },
      { status: 409 }
    )
  }

  await prisma.$transaction(async (tx) => {
    const txWithExchangeRate = tx as typeof tx & {
      exchangeRate: {
        upsert: (args: {
          where: { currency: string }
          update: { rateToMad: number }
          create: { currency: string; rateToMad: number }
        }) => Promise<unknown>
      }
    }

    await Promise.all(
      parsed.data.rates.map((rate) =>
        txWithExchangeRate.exchangeRate.upsert({
          where: { currency: rate.currency },
          update: { rateToMad: rate.rateToMad },
          create: { currency: rate.currency, rateToMad: rate.rateToMad },
        })
      )
    )
  })

  const rates = await getExchangeRateMap()
  return NextResponse.json({ rates })
}
