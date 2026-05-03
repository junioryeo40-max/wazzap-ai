import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const agents = await prisma.agent.findMany({
    where: { userId: user.id },
    include: {
      session: true,
      _count: { select: { messages: true, orders: true, faqs: true, products: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json({ agents })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { name, tone, objective } = await req.json()
  if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

  const agent = await prisma.agent.create({
    data: {
      userId: user.id,
      name,
      tone: tone || 'PROFESSIONAL',
      objective: objective || 'SUPPORT',
      business: {
        create: { name, updatedAt: new Date() }
      }
    },
    include: { session: true, _count: { select: { messages: true, orders: true } } }
  })

  return NextResponse.json({ agent }, { status: 201 })
}
