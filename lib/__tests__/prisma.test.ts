import { describe, it, expect } from 'vitest'

describe('prisma singleton', () => {
  it('is defined when imported', async () => {
    const { prisma } = await import('../prisma')
    expect(prisma).toBeDefined()
  })
})
