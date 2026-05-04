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

  if (BAILEYS_URL) {
    const res = await fetch(`${BAILEYS_URL}/session/${agentId}/status`, {
      headers: { 'x-secret': SECRET }
    })
    const data = await res.json()

    // Sync avec la base de données
    if (data.status === 'CONNECTED') {
      await prisma.whatsAppSession.upsert({
        where: { agentId },
        update: { status: 'CONNECTED', phoneNumber: data.phoneNumber },
        create: { agentId, status: 'CONNECTED', phoneNumber: data.phoneNumber }
      })
    }

    return NextResponse.json(data)
  }

  const session = await prisma.whatsAppSession.findUnique({ where: { agentId } })
  return NextResponse.json({ status: session?.status ?? 'DISCONNECTED', phoneNumber: session?.phoneNumber })
}
