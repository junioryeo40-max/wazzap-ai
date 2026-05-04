import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const BAILEYS_URL = process.env.BAILEYS_URL || ''
const SECRET = process.env.BAILEYS_SECRET || ''

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId requis' }, { status: 400 })

  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId: user.id } })
  if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })

  const start = searchParams.get('start') === '1'

  // Premier appel: démarrer la session
  if (start) {
    await fetch(`${BAILEYS_URL}/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-secret': SECRET },
      body: JSON.stringify({ agentId })
    }).catch(() => {})

    await prisma.whatsAppSession.upsert({
      where: { agentId },
      update: { status: 'CONNECTING' },
      create: { agentId, status: 'CONNECTING' }
    })

    return NextResponse.json({ qr: null, status: 'CONNECTING' })
  }

  // Appels suivants: récupérer le QR depuis Railway
  try {
    const res = await fetch(`${BAILEYS_URL}/session/${agentId}/qr`, {
      headers: { 'x-secret': SECRET }
    })
    const data = await res.json()
    return NextResponse.json({ qr: data.qr, status: data.status })
  } catch {
    return NextResponse.json({ qr: null, status: 'CONNECTING' })
  }
}
