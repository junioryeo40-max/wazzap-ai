import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId requis' }, { status: 400 })

  const session = await prisma.whatsAppSession.findUnique({ where: { agentId } })
  return NextResponse.json({ status: session?.status ?? 'DISCONNECTED', phoneNumber: session?.phoneNumber })
}
