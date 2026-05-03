import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')

  const agents = await prisma.agent.findMany({ where: { userId: user.id }, select: { id: true } })
  const agentIds = agents.map(a => a.id)

  const orders = await prisma.order.findMany({
    where: { agentId: agentId && agentIds.includes(agentId) ? agentId : { in: agentIds } },
    include: { agent: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  return NextResponse.json({ orders })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { orderId, status } = await req.json()
  const order = await prisma.order.findFirst({
    where: { id: orderId },
    include: { agent: true }
  })
  if (!order || order.agent.userId !== user.id) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  const updated = await prisma.order.update({ where: { id: orderId }, data: { status, updatedAt: new Date() } })
  return NextResponse.json({ order: updated })
}
