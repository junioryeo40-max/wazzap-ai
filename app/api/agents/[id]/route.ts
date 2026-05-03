import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { id } = await params

  const agent = await prisma.agent.findFirst({
    where: { id, userId: user.id },
    include: { business: true, faqs: true, products: true, session: true }
  })
  if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })
  return NextResponse.json({ agent })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const agent = await prisma.agent.findFirst({ where: { id, userId: user.id } })
  if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })

  const updated = await prisma.agent.update({
    where: { id },
    data: {
      name: body.name ?? agent.name,
      tone: body.tone ?? agent.tone,
      objective: body.objective ?? agent.objective,
      isActive: body.isActive ?? agent.isActive,
    }
  })
  return NextResponse.json({ agent: updated })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { id } = await params

  const agent = await prisma.agent.findFirst({ where: { id, userId: user.id } })
  if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })

  await prisma.agent.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
