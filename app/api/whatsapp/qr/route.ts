import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Génère un QR code de démonstration (sans Baileys pour l'instant)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId requis' }, { status: 400 })

  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId: user.id } })
  if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })

  // Simuler un code QR WhatsApp (en prod: utiliser Baileys)
  const demoData = `2@${Math.random().toString(36).substring(2)},${Date.now()},DEMO`
  const qrDataUrl = await QRCode.toDataURL(demoData, { width: 256, margin: 2 })

  await prisma.whatsAppSession.upsert({
    where: { agentId },
    update: { status: 'QR_PENDING' },
    create: { agentId, status: 'QR_PENDING' }
  })

  return NextResponse.json({ qr: qrDataUrl, status: 'QR_PENDING' })
}
