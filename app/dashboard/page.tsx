import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const [agents, balance, recentOrders, messagesCount] = await Promise.all([
    prisma.agent.findMany({ where: { userId: user.id }, include: { session: true } }),
    prisma.tokenBalance.findUnique({ where: { userId: user.id } }),
    prisma.order.findMany({
      where: { agent: { userId: user.id } },
      include: { agent: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.message.count({ where: { agent: { userId: user.id } } })
  ])

  const activeAgents = agents.filter(a => a.isActive).length
  const connectedAgents = agents.filter(a => a.session?.status === 'CONNECTED').length
  const pendingOrders = recentOrders.filter(o => o.status === 'PENDING').length

  const stats = [
    { label: 'Agents créés', value: agents.length, sub: `${activeAgents} actifs`, color: 'bg-blue-500', href: '/dashboard/agents' },
    { label: 'WhatsApp connectés', value: connectedAgents, sub: `sur ${agents.length} agents`, color: 'bg-indigo-500', href: '/dashboard/agents' },
    { label: 'Messages traités', value: messagesCount.toLocaleString(), sub: 'total', color: 'bg-purple-500', href: '/dashboard/conversations' },
    { label: 'Commandes', value: recentOrders.length, sub: `${pendingOrders} en attente`, color: 'bg-orange-500', href: '/dashboard/orders' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Bonjour, {user.name || user.email.split('@')[0]} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Voici l&apos;état de votre plateforme ChatFlow</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div className={`w-10 h-10 ${s.color} rounded-xl mb-3`} />
            <div className="text-2xl font-bold text-gray-800">{s.value}</div>
            <div className="text-sm font-medium text-gray-600">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tokens */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">Solde Tokens</h2>
            <Link href="/dashboard/tokens" className="text-indigo-600 text-sm font-medium hover:underline">Recharger</Link>
          </div>
          <div className="text-4xl font-bold text-indigo-700 mb-1">
            {(balance?.balance ?? 0).toLocaleString('fr-FR')}
          </div>
          <div className="text-gray-400 text-sm mb-4">tokens disponibles</div>

          {(balance?.totalBought ?? 0) > 0 && (
            <div className="bg-gray-100 rounded-xl p-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Utilisés</span>
                <span>{(balance?.totalUsed ?? 0).toLocaleString('fr-FR')} / {(balance?.totalBought ?? 0).toLocaleString('fr-FR')}</span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((balance?.totalUsed ?? 0) / Math.max(1, balance?.totalBought ?? 1)) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {(balance?.balance ?? 0) === 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              ⚠️ Tokens épuisés. Rechargez pour continuer.
            </div>
          )}
        </div>

        {/* Commandes récentes */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">Commandes récentes</h2>
            <Link href="/dashboard/orders" className="text-indigo-600 text-sm font-medium hover:underline">Voir tout</Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-sm">Aucune commande pour l&apos;instant</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <div className="font-medium text-gray-800 text-sm">{order.customerName || order.customerPhone}</div>
                    <div className="text-xs text-gray-400">{order.agent.name} · {new Date(order.createdAt).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-800 text-sm">{order.totalAmount.toLocaleString('fr-FR')} {order.currency}</div>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      {agents.length === 0 && (
        <div className="mt-6 bg-gradient-to-r from-indigo-800 to-indigo-700 rounded-2xl p-6 text-white">
          <h3 className="font-bold text-lg mb-2">Créez votre premier agent IA 🤖</h3>
          <p className="text-white/70 text-sm mb-4">En 5 minutes, connectez WhatsApp et automatisez votre service client.</p>
          <Link href="/dashboard/agents" className="bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#1da851] transition inline-block">
            Créer un agent
          </Link>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    PROCESSING: 'bg-purple-100 text-purple-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = {
    PENDING: 'En attente', CONFIRMED: 'Confirmée', PROCESSING: 'En cours',
    DELIVERED: 'Livrée', CANCELLED: 'Annulée'
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  )
}
