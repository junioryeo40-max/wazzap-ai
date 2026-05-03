import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const balance = await prisma.tokenBalance.findUnique({ where: { userId: user.id } })
  return NextResponse.json({ user, balance: balance?.balance ?? 0 })
}
