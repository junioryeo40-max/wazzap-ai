import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')
  const phone = searchParams.get('phone')

  const agents = await prisma.agent.findMany({ where: { userId: user.id }, select: { id: true } })
  const agentIds = agents.map(a => a.id)

  if (agentIds.length === 0) return NextResponse.json({ conversations: [], messages: [] })

  // Conversation detail : tous les messages d'un client
  if (phone && agentId) {
    const messages = await prisma.message.findMany({
      where: { agentId, customerPhone: phone },
      orderBy: { createdAt: 'asc' },
      take: 200
    })
    return NextResponse.json({ messages })
  }

  // Liste des conversations uniques : on prend le dernier message de chaque (phone, agentId)
  const allMessages = await prisma.message.findMany({
    where: { agentId: agentId && agentIds.includes(agentId) ? agentId : { in: agentIds } },
    orderBy: { createdAt: 'desc' },
    select: { customerPhone: true, agentId: true, createdAt: true, id: true }
  })

  // Dédupliquer par (customerPhone, agentId) — garder le plus récent
  const seen = new Map<string, { customerPhone: string; agentId: string; _max: { createdAt: string }; _count: { id: number } }>()
  for (const msg of allMessages) {
    const key = `${msg.agentId}:${msg.customerPhone}`
    if (!seen.has(key)) {
      seen.set(key, { customerPhone: msg.customerPhone, agentId: msg.agentId, _max: { createdAt: msg.createdAt.toISOString() }, _count: { id: 0 } })
    }
    seen.get(key)!._count.id++
  }

  const conversations = Array.from(seen.values()).slice(0, 50)
  return NextResponse.json({ conversations })
}
