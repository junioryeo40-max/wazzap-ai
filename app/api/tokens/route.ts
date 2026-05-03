import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const [balance, transactions] = await Promise.all([
    prisma.tokenBalance.findUnique({ where: { userId: user.id } }),
    prisma.tokenTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30
    })
  ])

  return NextResponse.json({
    balance: balance?.balance ?? 0,
    totalBought: balance?.totalBought ?? 0,
    totalUsed: balance?.totalUsed ?? 0,
    transactions
  })
}
