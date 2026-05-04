import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const TOKENS_PER_MESSAGE = 50

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { agentId, phone, message } = await req.json()
  if (!agentId || !phone || !message) {
    return NextResponse.json({ error: 'agentId, phone et message requis' }, { status: 400 })
  }

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId: user.id },
    include: { business: true, faqs: true, products: true }
  })
  if (!agent) return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 })

  // Vérifier solde tokens
  const balance = await prisma.tokenBalance.findUnique({ where: { userId: user.id } })
  if (!balance || balance.balance < TOKENS_PER_MESSAGE) {
    return NextResponse.json({ error: 'Solde de tokens insuffisant' }, { status: 402 })
  }

  // Sauvegarder message entrant
  await prisma.message.create({
    data: { agentId, customerPhone: phone, direction: 'INBOUND', content: message, source: 'AI' }
  })

  // 1. Chercher correspondance FAQ exacte (gratuit)
  const msg = message.toLowerCase().trim()
  const faqMatch = agent.faqs.find(faq => {
    const q = faq.question.toLowerCase()
    const keys = faq.keywords.split(',').map(k => k.toLowerCase().trim()).filter(Boolean)
    return msg.includes(q.substring(0, 20)) || keys.some(k => k.length > 2 && msg.includes(k))
  })

  let response = ''
  let source = 'AI'
  let tokensUsed = TOKENS_PER_MESSAGE

  if (faqMatch) {
    response = faqMatch.answer
    source = 'FAQ'
    tokensUsed = 0
  } else {
    // 2. Construire le contexte métier pour GPT
    const businessName = agent.business?.name || agent.name
    const productsList = agent.products.length > 0
      ? agent.products.map(p => `- ${p.name}: ${p.price.toLocaleString('fr-FR')} ${p.currency}${p.description ? ` (${p.description})` : ''}`).join('\n')
      : 'Aucun produit configuré.'
    const faqList = agent.faqs.length > 0
      ? agent.faqs.map(f => `Q: ${f.question}\nR: ${f.answer}`).join('\n\n')
      : 'Aucune FAQ configurée.'

    const systemPrompt = `Tu es l'assistant WhatsApp IA de "${businessName}".
Ton rôle: répondre aux clients de manière professionnelle, amicale et concise (max 3 phrases).
Réponds toujours dans la langue du client.

INFORMATIONS SUR L'ENTREPRISE:
- Nom: ${businessName}
${agent.business?.description ? `- Description: ${agent.business.description}` : ''}
${agent.business?.address ? `- Adresse: ${agent.business.address}` : ''}
${agent.business?.hours ? `- Horaires: ${agent.business.hours}` : ''}
${agent.business?.deliveryInfo ? `- Livraison: ${agent.business.deliveryInfo}` : ''}

PRODUITS DISPONIBLES:
${productsList}

FAQ:
${faqList}

Règles importantes:
- Ne jamais inventer des prix ou informations non fournies
- Si tu ne sais pas, invite le client à contacter directement l'entreprise
- Sois chaleureux et utilise des emojis avec modération
- Pour les commandes, demande: produit, adresse, nom complet`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 300,
      temperature: 0.7,
    })

    response = completion.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu traiter votre demande.'
    source = 'AI'
    tokensUsed = TOKENS_PER_MESSAGE
  }

  // Sauvegarder réponse
  await prisma.message.create({
    data: { agentId, customerPhone: phone, direction: 'OUTBOUND', content: response, tokensUsed, source }
  })

  // Déduire tokens
  if (tokensUsed > 0) {
    await prisma.tokenBalance.update({
      where: { userId: user.id },
      data: {
        balance: { decrement: tokensUsed },
        totalUsed: { increment: tokensUsed },
        updatedAt: new Date()
      }
    })
    await prisma.tokenTransaction.create({
      data: {
        userId: user.id,
        agentId,
        type: 'USAGE',
        amount: -tokensUsed,
        balanceBefore: balance.balance,
        balanceAfter: balance.balance - tokensUsed,
        description: `Message IA — agent ${agent.name}`
      }
    })
  }

  return NextResponse.json({ success: true, response, source, tokensUsed })
}
