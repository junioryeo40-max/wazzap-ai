'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Bot, Wifi, WifiOff, Settings, Trash2, QrCode, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Agent {
  id: string
  name: string
  tone: string
  objective: string
  isActive: boolean
  createdAt: string
  session: { status: string; phoneNumber?: string } | null
  _count: { messages: number; orders: number; faqs: number; products: number }
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', tone: 'PROFESSIONAL', objective: 'SUPPORT' })
  const [creating, setCreating] = useState(false)

  const fetchAgents = useCallback(async () => {
    const res = await fetch('/api/agents')
    const data = await res.json()
    setAgents(data.agents || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAgents() }, [fetchAgents])

  async function createAgent(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      await fetchAgents()
      setShowCreate(false)
      setForm({ name: '', tone: 'PROFESSIONAL', objective: 'SUPPORT' })
    }
    setCreating(false)
  }

  async function deleteAgent(id: string) {
    if (!confirm('Supprimer cet agent ?')) return
    await fetch(`/api/agents/${id}`, { method: 'DELETE' })
    fetchAgents()
  }

  async function toggleActive(agent: Agent) {
    await fetch(`/api/agents/${agent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !agent.isActive })
    })
    fetchAgents()
  }

  const toneLabels: Record<string, string> = { PROFESSIONAL: 'Professionnel', FRIENDLY: 'Amical', SELLER: 'Vendeur' }
  const objectiveLabels: Record<string, string> = { SUPPORT: 'Support', SALES: 'Vente', QUALIFICATION: 'Qualification', FAQ: 'FAQ' }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mes Agents IA</h1>
          <p className="text-gray-500 text-sm">{agents.length} agent{agents.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2.5 rounded-xl font-medium hover:bg-[#1da851] transition"
        >
          <Plus size={18} />
          Créer un agent
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 mb-5">Créer un agent IA</h2>
            <form onSubmit={createAgent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;agent</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#25D366] text-gray-800"
                  placeholder="Ex: Assistant Boutique Dakar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ton</label>
                <select
                  value={form.tone}
                  onChange={e => setForm({ ...form, tone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#25D366] text-gray-800"
                >
                  <option value="PROFESSIONAL">Professionnel</option>
                  <option value="FRIENDLY">Amical</option>
                  <option value="SELLER">Vendeur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objectif</label>
                <select
                  value={form.objective}
                  onChange={e => setForm({ ...form, objective: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#25D366] text-gray-800"
                >
                  <option value="SUPPORT">Service client</option>
                  <option value="SALES">Vente</option>
                  <option value="QUALIFICATION">Qualification leads</option>
                  <option value="FAQ">Réponses FAQ</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={creating} className="flex-1 bg-[#25D366] text-white py-2.5 rounded-lg font-medium hover:bg-[#1da851] disabled:opacity-60">
                  {creating ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Agents list */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin" /></div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl">
          <Bot size={56} className="text-gray-200 mx-auto mb-4" />
          <h3 className="font-bold text-gray-700 text-lg mb-2">Aucun agent</h3>
          <p className="text-gray-400 text-sm mb-5">Créez votre premier agent WhatsApp IA</p>
          <button onClick={() => setShowCreate(true)} className="bg-[#25D366] text-white px-6 py-2.5 rounded-xl font-medium">
            Créer mon premier agent
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {agents.map(agent => (
            <div key={agent.id} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#075E54] rounded-xl flex items-center justify-center text-white">
                  <Bot size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-800">{agent.name}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{toneLabels[agent.tone]}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{objectiveLabels[agent.objective]}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{agent._count.messages} messages</span>
                    <span>{agent._count.orders} commandes</span>
                    <span>{agent._count.faqs} FAQ</span>
                    <span>{agent._count.products} produits</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {agent.session?.status === 'CONNECTED' ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <Wifi size={11} /> Connecté {agent.session.phoneNumber && `· +${agent.session.phoneNumber}`}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        <WifiOff size={11} /> Non connecté
                      </span>
                    )}
                    <button
                      onClick={() => toggleActive(agent)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition ${
                        agent.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {agent.isActive ? 'Actif' : 'Inactif'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/dashboard/agents/${agent.id}`}
                    className="p-2 text-gray-400 hover:text-[#25D366] hover:bg-gray-100 rounded-lg transition">
                    <Settings size={18} />
                  </Link>
                  <button onClick={() => deleteAgent(agent.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={18} />
                  </button>
                  <Link href={`/dashboard/agents/${agent.id}`}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                    <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
