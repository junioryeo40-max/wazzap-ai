import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { id } = await params
  const faqs = await prisma.fAQ.findMany({ where: { agentId: id }, orderBy: { hitCount: 'desc' } })
  return NextResponse.json({ faqs })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { id } = await params
  const { question, answer, keywords } = await req.json()
  const faq = await prisma.fAQ.create({
    data: { agentId: id, question, answer, keywords: keywords || '' }
  })
  return NextResponse.json({ faq }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { id } = await params
  const { faqId } = await req.json()
  await prisma.fAQ.delete({ where: { id: faqId, agentId: id } })
  return NextResponse.json({ success: true })
}
