import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { id } = await params

  const agent = await prisma.agent.findFirst({ where: { id, userId: user.id } })
  if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })

  const body = await req.json()
  const business = await prisma.business.upsert({
    where: { agentId: id },
    update: { ...body, updatedAt: new Date() },
    create: { agentId: id, name: body.name || agent.name, ...body, updatedAt: new Date() }
  })
  return NextResponse.json({ business })
}
