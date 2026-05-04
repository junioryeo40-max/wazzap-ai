import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

const SECRET = process.env.BAILEYS_SECRET || ''

export async function POST(req: NextRequest) {
  if (req.headers.get('x-secret') !== SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { event, agentId, phoneNumber, phone, message } = await req.json()

  // Événement: WhatsApp connecté
  if (event === 'connected') {
    await prisma.whatsAppSession.upsert({
      where: { agentId },
      update: { status: 'CONNECTED', phoneNumber: phoneNumber ?? null },
      create: { agentId, status: 'CONNECTED', phoneNumber: phoneNumber ?? null }
    })
    return NextResponse.json({ success: true })
  }

  // Événement: message entrant
  if (event === 'message') {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { business: true, faqs: true, products: true, user: true }
    })
    if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })

    // Vérifier solde tokens
    const balance = await prisma.tokenBalance.findUnique({ where: { userId: agent.userId } })
    const TOKENS_PER_MESSAGE = 50
    if (!balance || balance.balance < TOKENS_PER_MESSAGE) {
      return NextResponse.json({ response: 'Service temporairement indisponible.' })
    }

    // Sauvegarder message entrant
    await prisma.message.create({
      data: { agentId, customerPhone: phone, direction: 'INBOUND', content: message, source: 'AI' }
    })

    // Chercher FAQ
    const msg = message.toLowerCase().trim()
    const faqMatch = agent.faqs.find(faq => {
      const q = faq.question.toLowerCase()
      const keys = faq.keywords.split(',').map(k => k.toLowerCase().trim()).filter(Boolean)
      return msg.includes(q.substring(0, 20)) || keys.some(k => k.length > 2 && msg.includes(k))
    })

    let response = ''
    let tokensUsed = TOKENS_PER_MESSAGE

    if (faqMatch) {
      response = faqMatch.answer
      tokensUsed = 0
    } else {
      const businessName = agent.business?.name || agent.name
      const productsList = agent.products.length > 0
        ? agent.products.map(p => `- ${p.name}: ${p.price.toLocaleString('fr-FR')} ${p.currency}${p.description ? ` (${p.description})` : ''}`).join('\n')
        : 'Aucun produit configuré.'
      const faqList = agent.faqs.length > 0
        ? agent.faqs.map(f => `Q: ${f.question}\nR: ${f.answer}`).join('\n\n')
        : 'Aucune FAQ configurée.'

      const prompt = `Tu es l'assistant WhatsApp IA de "${businessName}".
Ton rôle: répondre aux clients de manière professionnelle, amicale et concise (max 3 phrases).
Réponds toujours dans la langue du client.

INFORMATIONS:
- Nom: ${businessName}
${agent.business?.description ? `- Description: ${agent.business.description}` : ''}
${agent.business?.address ? `- Adresse: ${agent.business.address}` : ''}
${agent.business?.hours ? `- Horaires: ${agent.business.hours}` : ''}
${agent.business?.deliveryInfo ? `- Livraison: ${agent.business.deliveryInfo}` : ''}

PRODUITS:
${productsList}

FAQ:
${faqList}

Règles: Ne jamais inventer des infos. Si tu ne sais pas, invite à contacter directement. Emojis avec modération.

Message du client: ${message}`

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(prompt)
      response = result.response.text()
    }

    // Sauvegarder réponse
    await prisma.message.create({
      data: { agentId, customerPhone: phone, direction: 'OUTBOUND', content: response, tokensUsed, source: faqMatch ? 'FAQ' : 'AI' }
    })

    // Déduire tokens
    if (tokensUsed > 0) {
      await prisma.tokenBalance.update({
        where: { userId: agent.userId },
        data: { balance: { decrement: tokensUsed }, totalUsed: { increment: tokensUsed }, updatedAt: new Date() }
      })
    }

    return NextResponse.json({ response })
  }

  return NextResponse.json({ success: true })
}
