import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { id } = await params
  const products = await prisma.product.findMany({ where: { agentId: id }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ products })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { id } = await params
  const { name, description, price, currency } = await req.json()
  const product = await prisma.product.create({
    data: { agentId: id, name, description, price: parseFloat(price), currency: currency || 'XOF' }
  })
  return NextResponse.json({ product }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const { id } = await params
  const { productId } = await req.json()
  await prisma.product.delete({ where: { id: productId, agentId: id } })
  return NextResponse.json({ success: true })
}
