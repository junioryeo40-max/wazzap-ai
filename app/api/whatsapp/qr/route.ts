import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const BAILEYS_URL = process.env.BAILEYS_URL || ''
const SECRET = process.env.BAILEYS_SECRET || ''

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { agentId, phoneNumber } = await req.json()
  if (!agentId || !phoneNumber) return NextResponse.json({ error: 'agentId et phoneNumber requis' }, { status: 400 })

  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId: user.id } })
  if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })

  const res = await fetch(`${BAILEYS_URL}/session/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-secret': SECRET },
    body: JSON.stringify({ agentId, phoneNumber }),
    signal: AbortSignal.timeout(20000)
  })

  const data = await res.json()

  await prisma.whatsAppSession.upsert({
    where: { agentId },
    update: { status: data.status || 'PAIRING' },
    create: { agentId, status: data.status || 'PAIRING' }
  })

  return NextResponse.json(data)
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId requis' }, { status: 400 })

  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId: user.id } })
  if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })

  const res = await fetch(`${BAILEYS_URL}/session/${agentId}/status`, {
    headers: { 'x-secret': SECRET }
  })
  const data = await res.json()
  return NextResponse.json(data)
}
