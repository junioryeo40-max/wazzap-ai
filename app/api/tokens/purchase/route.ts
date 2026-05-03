import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const PACKS = {
  STARTER:  { tokens: 20_000,  amount: 2500  },
  BUSINESS: { tokens: 100_000, amount: 10000 },
  PRO:      { tokens: 300_000, amount: 25000 },
} as const

// Simulation paiement Wave (à remplacer par vraie API)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { pack } = await req.json()
  const packInfo = PACKS[pack as keyof typeof PACKS]
  if (!packInfo) return NextResponse.json({ error: 'Pack invalide' }, { status: 400 })

  // En mode démo: crédit immédiat (sans vrai paiement)
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      pack,
      amount: packInfo.amount,
      currency: 'XOF',
      tokensGranted: packInfo.tokens,
      status: 'COMPLETED',
      waveRef: `DEMO-${Date.now()}`
    }
  })

  const balance = await prisma.tokenBalance.upsert({
    where: { userId: user.id },
    update: {
      balance: { increment: packInfo.tokens },
      totalBought: { increment: packInfo.tokens },
      updatedAt: new Date()
    },
    create: {
      userId: user.id,
      balance: packInfo.tokens,
      totalBought: packInfo.tokens,
      totalUsed: 0,
      updatedAt: new Date()
    }
  })

  const prev = balance.balance - packInfo.tokens
  await prisma.tokenTransaction.create({
    data: {
      userId: user.id,
      type: 'PURCHASE',
      amount: packInfo.tokens,
      balanceBefore: prev,
      balanceAfter: balance.balance,
      description: `Achat pack ${pack} (${packInfo.amount} XOF)`
    }
  })

  return NextResponse.json({ success: true, payment, newBalance: balance.balance })
}
