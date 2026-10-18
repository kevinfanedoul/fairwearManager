import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { parseSheet } from '../lib/import-clients/parser'
import type { ParsedClient } from '../lib/import-clients/parser'

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
})
const prisma = new PrismaClient({ adapter })

const CLIENTS_DIR = path.resolve(process.cwd(), 'clients')

async function upsertClient(parsed: ParsedClient): Promise<{ id: string; created: boolean } | null> {
  if (!parsed.company && !parsed.firstName && !parsed.lastName) return null

  let existing = null
  if (parsed.company) {
    existing = await prisma.client.findFirst({ where: { company: parsed.company } })
  } else if (parsed.firstName && parsed.lastName) {
    existing = await prisma.client.findFirst({
      where: { firstName: parsed.firstName, lastName: parsed.lastName },
    })
  }

  if (existing) return { id: existing.id, created: false }

  const created = await prisma.client.create({
    data: {
      type: parsed.type,
      company: parsed.company ?? null,
      firstName: parsed.firstName ?? null,
      lastName: parsed.lastName ?? null,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      address: parsed.address ?? null,
      city: parsed.city ?? null,
      country: parsed.country ?? 'MA',
      ice: parsed.ice ?? null,
      notes: parsed.notes ?? null,
    },
  })
  return { id: created.id, created: true }
}

async function main() {
  const files = fs
    .readdirSync(CLIENTS_DIR)
    .filter((f) => f.toLowerCase().endsWith('.html'))
    .sort()

  console.log(`📂 ${files.length} fichiers HTML détectés dans clients/\n`)

  let clientsCreated = 0
  let clientsReused = 0
  let clientsSkipped = 0
  const warnings: string[] = []

  for (const file of files) {
    const sheetName = path.basename(file, path.extname(file)).trim()
    const html = fs.readFileSync(path.join(CLIENTS_DIR, file), 'utf-8')
    const parsed = parseSheet(html, sheetName)

    for (const w of parsed.warnings) {
      if (!w.startsWith('commande sans date')) warnings.push(`${sheetName}: ${w}`)
    }

    if (!parsed.client) {
      clientsSkipped++
      continue
    }

    const result = await upsertClient(parsed.client)
    if (!result) {
      clientsSkipped++
      continue
    }

    if (result.created) clientsCreated++
    else clientsReused++
  }

  console.log('\n📊 Résultat de l\'import (clients uniquement):')
  console.log(`  Clients créés:      ${clientsCreated}`)
  console.log(`  Clients réutilisés: ${clientsReused}`)
  console.log(`  Clients ignorés:    ${clientsSkipped}`)

  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} avertissement(s):`)
    for (const w of warnings) console.log(`   - ${w}`)
  }

  console.log('\n✅ Import terminé !')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
