import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        tokenBalance: {
          create: { balance: 500, totalBought: 0, totalUsed: 0 }
        }
      }
    })

    await prisma.tokenTransaction.create({
      data: {
        userId: user.id,
        type: 'BONUS',
        amount: 500,
        balanceBefore: 0,
        balanceAfter: 500,
        description: 'Bonus inscription'
      }
    })

    const token = signToken(user.id)
    const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name } })
    response.cookies.set('token', token, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 })
    return response
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
