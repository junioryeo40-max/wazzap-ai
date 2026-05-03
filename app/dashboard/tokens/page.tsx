'use client'
import { useState, useEffect, useCallback } from 'react'
import { TrendingDown, TrendingUp, ShoppingCart } from 'lucide-react'

interface TokenData {
  balance: number
  totalBought: number
  totalUsed: number
  transactions: { id: string; type: string; amount: number; description: string; createdAt: string; balanceAfter: number }[]
}

const PACKS = [
  { id: 'STARTER', name: 'Starter', tokens: 20_000, price: 2_500, desc: 'Pour démarrer', color: 'border-blue-300 bg-blue-50' },
  { id: 'BUSINESS', name: 'Business', tokens: 100_000, price: 10_000, desc: 'Pour les PME', color: 'border-green-400 bg-green-50', popular: true },
  { id: 'PRO', name: 'Pro', tokens: 300_000, price: 25_000, desc: 'Grande capacité', color: 'border-purple-300 bg-purple-50' },
]

export default function TokensPage() {
  const [data, setData] = useState<TokenData | null>(null)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/tokens')
    const d = await res.json()
    setData(d)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function purchase(packId: string) {
    setPurchasing(packId)
    setMessage('')
    const res = await fetch('/api/tokens/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack: packId })
    })
    const result = await res.json()
    if (res.ok) {
      setMessage(`✅ ${PACKS.find(p => p.id === packId)?.tokens.toLocaleString('fr-FR')} tokens crédités !`)
      fetchData()
    } else {
      setMessage('❌ ' + result.error)
    }
    setPurchasing(null)
  }

  if (!data) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const usedPercent = data.totalBought > 0 ? Math.min(100, (data.totalUsed / data.totalBought) * 100) : 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tokens</h1>
        <p className="text-gray-500 text-sm">Gérez votre solde de tokens</p>
      </div>

      {/* Balance card */}
      <div className="bg-gradient-to-r from-[#075E54] to-[#128C7E] rounded-2xl p-6 text-white mb-6">
        <div className="text-white/70 text-sm mb-1">Solde actuel</div>
        <div className="text-5xl font-bold mb-3">{data.balance.toLocaleString('fr-FR')}</div>
        <div className="text-white/70 text-sm mb-4">tokens</div>
        <div className="bg-white/20 rounded-full h-2 mb-2">
          <div className="bg-[#25D366] h-2 rounded-full transition-all" style={{ width: `${100 - usedPercent}%` }} />
        </div>
        <div className="flex justify-between text-xs text-white/60">
          <span>Utilisés: {data.totalUsed.toLocaleString('fr-FR')}</span>
          <span>Achetés: {data.totalBought.toLocaleString('fr-FR')}</span>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-xl text-sm font-medium ${message.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      {/* Bannière mode démo */}
      <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <span className="text-xl shrink-0">🔧</span>
        <div>
          <div className="font-semibold text-amber-800 text-sm">Mode démonstration</div>
          <div className="text-amber-700 text-xs mt-0.5">
            Les tokens sont crédités immédiatement sans paiement réel.
            En production, le bouton redirigera vers <strong>Wave</strong> pour payer en FCFA,
            puis reviendra ici automatiquement après confirmation.
          </div>
        </div>
      </div>

      {/* Packs */}
      <h2 className="font-bold text-gray-800 mb-4">Recharger — Paiement Wave</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {PACKS.map(pack => (
          <div key={pack.id} className={`relative border-2 rounded-2xl p-5 ${pack.color} ${pack.popular ? 'ring-2 ring-[#25D366]' : ''}`}>
            {pack.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#25D366] text-white text-xs font-bold px-3 py-0.5 rounded-full">
                POPULAIRE
              </div>
            )}
            <div className="font-bold text-gray-800 text-lg">{pack.name}</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{pack.price.toLocaleString('fr-FR')}</div>
            <div className="text-gray-500 text-sm">FCFA</div>
            <div className="text-2xl font-semibold text-gray-800 mt-3">{pack.tokens.toLocaleString('fr-FR')}</div>
            <div className="text-gray-500 text-sm mb-1">tokens</div>
            <div className="text-gray-400 text-xs mb-4">{pack.desc}</div>
            <button
              onClick={() => purchase(pack.id)}
              disabled={purchasing === pack.id}
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-2.5 rounded-xl font-medium hover:bg-[#1da851] transition disabled:opacity-60"
            >
              {purchasing === pack.id ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Traitement...</>
              ) : (
                <><ShoppingCart size={16} /> Acheter (démo)</>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Historique */}
      <h2 className="font-bold text-gray-800 mb-4">Historique des transactions</h2>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {data.transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm">Aucune transaction</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {tx.amount > 0 ? <TrendingUp size={16} className="text-green-600" /> : <TrendingDown size={16} className="text-red-500" />}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800 text-sm">{tx.description || tx.type}</div>
                    <div className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString('fr-FR')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('fr-FR')}
                  </div>
                  <div className="text-xs text-gray-400">Solde: {tx.balanceAfter.toLocaleString('fr-FR')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
