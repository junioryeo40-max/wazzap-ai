import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  // Sauvegarder message entrant
  await prisma.message.create({
    data: { agentId, customerPhone: phone, direction: 'INBOUND', content: message, source: 'AI' }
  })

  const msg = message.toLowerCase().trim()
  let response = ''
  let source = 'RAG'
  let tokensUsed = 0

  // 1. Chercher correspondance FAQ (gratuit)
  const faqMatch = agent.faqs.find(faq => {
    const q = faq.question.toLowerCase()
    const keys = faq.keywords.split(',').map(k => k.toLowerCase().trim()).filter(Boolean)
    return msg.includes(q.substring(0, 20)) || keys.some(k => k.length > 2 && msg.includes(k))
  })

  if (faqMatch) {
    response = faqMatch.answer
    source = 'FAQ'
    tokensUsed = 0

  // 2. Répondre selon l'intention détectée (RAG — base de données)
  } else if (/bonjour|salut|bonsoir|hello|hi|bjr|coucou/.test(msg)) {
    const businessName = agent.business?.name || agent.name
    const hours = agent.business?.hours ? ` Nous sommes ouverts ${agent.business.hours}.` : ''
    response = `Bonjour ! Bienvenue chez ${businessName}. 😊${hours} Comment puis-je vous aider aujourd'hui ?`
    source = 'RAG'
    tokensUsed = 25

  } else if (/produit|article|catalogue|quoi|propose|vend|disponible/.test(msg)) {
    if (agent.products.length === 0) {
      response = `Nous n'avons pas encore de catalogue configuré. Contactez-nous directement pour connaître nos produits.`
    } else {
      const list = agent.products.slice(0, 5).map(p => `• ${p.name} — ${p.price.toLocaleString('fr-FR')} ${p.currency}`).join('\n')
      response = `Voici nos produits disponibles :\n\n${list}\n\nLequel vous intéresse ?`
    }
    source = 'RAG'
    tokensUsed = 30

  } else if (/prix|combien|tarif|coût|coute|coûte/.test(msg)) {
    if (agent.products.length === 0) {
      response = `Contactez-nous directement pour connaître nos tarifs.`
    } else {
      const list = agent.products.slice(0, 5).map(p => `• ${p.name} : ${p.price.toLocaleString('fr-FR')} ${p.currency}`).join('\n')
      response = `Nos tarifs :\n\n${list}`
    }
    source = 'RAG'
    tokensUsed = 28

  } else if (/heure|horaire|ouvert|ferme|quand/.test(msg)) {
    if (agent.business?.hours) {
      response = `Nos horaires d'ouverture : ${agent.business.hours}`
    } else {
      response = `Nos horaires ne sont pas encore configurés. Écrivez-nous et nous vous répondrons dès que possible.`
    }
    source = 'RAG'
    tokensUsed = 20

  } else if (/adresse|où|localisation|trouver|situe|quartier/.test(msg)) {
    if (agent.business?.address) {
      response = `Notre adresse : ${agent.business.address}`
    } else {
      response = `Notre adresse n'est pas encore configurée sur notre système.`
    }
    source = 'RAG'
    tokensUsed = 20

  } else if (/livraison|délai|livrer|expédition|recevoir/.test(msg)) {
    if (agent.business?.deliveryInfo) {
      response = `Informations sur la livraison :\n${agent.business.deliveryInfo}`
    } else {
      response = `Contactez-nous pour les détails de livraison dans votre zone.`
    }
    source = 'RAG'
    tokensUsed = 25

  } else if (/commander|commande|acheter|je prends|je veux|je voudrais/.test(msg)) {
    const businessName = agent.business?.name || agent.name
    response = `Super ! 🛒 Pour passer une commande chez ${businessName}, j'ai besoin de :\n\n1. Le(s) produit(s) souhaité(s)\n2. Votre adresse de livraison\n3. Votre nom complet\n\nPouvez-vous me donner ces informations ?`
    source = 'RAG'
    tokensUsed = 40

  } else if (/merci|parfait|nickel|super|ok|bien|d'accord|daccord/.test(msg)) {
    response = `Avec plaisir ! 😊 N'hésitez pas si vous avez d'autres questions.`
    source = 'RAG'
    tokensUsed = 15

  } else {
    // Réponse IA simulée (comptée comme IA)
    const businessName = agent.business?.name || agent.name
    const productCount = agent.products.length
    response = `Merci pour votre message ! Je suis l'assistant de ${businessName}.`
    if (productCount > 0) {
      response += ` Nous proposons ${productCount} produit${productCount > 1 ? 's' : ''}.`
    }
    response += ` Pour mieux vous aider, pourriez-vous préciser votre demande ? (produits, prix, horaires, livraison...)`
    source = 'AI'
    tokensUsed = 55
  }

  // Sauvegarder réponse de l'agent
  await prisma.message.create({
    data: { agentId, customerPhone: phone, direction: 'OUTBOUND', content: response, tokensUsed, source }
  })

  // Déduire tokens si nécessaire
  if (tokensUsed > 0) {
    const balance = await prisma.tokenBalance.findUnique({ where: { userId: user.id } })
    if (balance && balance.balance >= tokensUsed) {
      await prisma.tokenBalance.update({
        where: { userId: user.id },
        data: {
          balance: { decrement: tokensUsed },
          totalUsed: { increment: tokensUsed },
          updatedAt: new Date()
        }
      })
    }
  }

  return NextResponse.json({ success: true, response, source, tokensUsed })
}
