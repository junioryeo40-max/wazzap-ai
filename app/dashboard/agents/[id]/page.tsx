'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Save, Plus, Trash2, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import Link from 'next/link'

interface Agent {
  id: string; name: string; tone: string; objective: string; isActive: boolean
  business: { name: string; description?: string; address?: string; hours?: string; deliveryInfo?: string } | null
  faqs: { id: string; question: string; answer: string; hitCount: number }[]
  products: { id: string; name: string; price: number; currency: string; description?: string }[]
  session: { status: string; phoneNumber?: string } | null
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [tab, setTab] = useState<'info' | 'faq' | 'products' | 'whatsapp'>('info')
  const [saving, setSaving] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)
  const [pairingStatus, setPairingStatus] = useState('')
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', keywords: '' })
  const [newProduct, setNewProduct] = useState({ name: '', price: '', currency: 'XOF', description: '' })
  const [business, setBusiness] = useState({ name: '', description: '', address: '', hours: '', deliveryInfo: '' })

  const fetchAgent = useCallback(async () => {
    const res = await fetch(`/api/agents/${id}`)
    const data = await res.json()
    if (data.agent) {
      setAgent(data.agent)
      if (data.agent.business) setBusiness({ ...data.agent.business })
    }
  }, [id])

  useEffect(() => { fetchAgent() }, [fetchAgent])

  async function saveBusiness() {
    setSaving(true)
    await fetch(`/api/agents/${id}/business`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(business)
    })
    setSaving(false)
    fetchAgent()
  }

  async function addFaq(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/agents/${id}/faqs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newFaq)
    })
    setNewFaq({ question: '', answer: '', keywords: '' })
    fetchAgent()
  }

  async function deleteFaq(faqId: string) {
    await fetch(`/api/agents/${id}/faqs`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ faqId })
    })
    fetchAgent()
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/agents/${id}/products`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newProduct)
    })
    setNewProduct({ name: '', price: '', currency: 'XOF', description: '' })
    fetchAgent()
  }

  async function deleteProduct(productId: string) {
    await fetch(`/api/agents/${id}/products`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId })
    })
    fetchAgent()
  }

  async function connectWhatsApp(e: React.FormEvent) {
    e.preventDefault()
    if (!phoneInput.trim()) return
    setLoadingQr(true)
    setPairingCode(null)
    setPairingStatus('Connexion en cours...')

    try {
      const res = await fetch('/api/whatsapp/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: id, phoneNumber: phoneInput.replace(/\D/g, '') })
      })
      const data = await res.json()

      if (data.pairingCode) {
        setPairingCode(data.pairingCode)
        setPairingStatus('Entrez ce code dans WhatsApp → Appareils liés → Lier avec numéro')

        // Poller pour détecter la connexion
        let attempts = 0
        const poll = setInterval(async () => {
          attempts++
          const r = await fetch(`/api/whatsapp/qr?agentId=${id}`)
          const d = await r.json()
          if (d.status === 'CONNECTED') {
            clearInterval(poll)
            setPairingStatus('Connecté !')
            setLoadingQr(false)
            fetchAgent()
          }
          if (attempts >= 30) { clearInterval(poll); setLoadingQr(false) }
        }, 3000)
      } else {
        setPairingStatus('Impossible de générer le code. Réessayez.')
        setLoadingQr(false)
      }
    } catch {
      setPairingStatus('Erreur de connexion.')
      setLoadingQr(false)
    }
  }

  if (!agent) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const tabs = [
    { id: 'info', label: 'Entreprise' },
    { id: 'faq', label: `FAQ (${agent.faqs.length})` },
    { id: 'products', label: `Produits (${agent.products.length})` },
    { id: 'whatsapp', label: 'WhatsApp' },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/agents" className="p-2 hover:bg-gray-200 rounded-lg transition">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{agent.name}</h1>
          <p className="text-gray-500 text-sm">Configuration de l&apos;agent</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              tab === t.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Entreprise */}
      {tab === 'info' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-4">Informations entreprise</h2>
          <div className="space-y-4">
            {[
              { key: 'name', label: 'Nom de l\'entreprise', placeholder: 'Ex: Boutique Mode Dakar' },
              { key: 'description', label: 'Description', placeholder: 'Décrivez votre activité' },
              { key: 'address', label: 'Adresse', placeholder: 'Votre adresse physique' },
              { key: 'hours', label: 'Horaires', placeholder: 'Ex: Lun-Sam 8h-20h' },
              { key: 'deliveryInfo', label: 'Infos livraison', placeholder: 'Ex: Livraison Dakar 24h — 1000 FCFA' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  value={business[key as keyof typeof business] || ''}
                  onChange={e => setBusiness({ ...business, [key]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800"
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          <button onClick={saveBusiness} disabled={saving}
            className="mt-5 flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-60">
            <Save size={16} />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      )}

      {/* Tab: FAQ */}
      {tab === 'faq' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4">Ajouter une FAQ</h2>
            <form onSubmit={addFaq} className="space-y-3">
              <input required value={newFaq.question} onChange={e => setNewFaq({ ...newFaq, question: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800"
                placeholder="Question" />
              <textarea required value={newFaq.answer} onChange={e => setNewFaq({ ...newFaq, answer: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800"
                placeholder="Réponse" rows={3} />
              <input value={newFaq.keywords} onChange={e => setNewFaq({ ...newFaq, keywords: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800"
                placeholder="Mots-clés (séparés par virgule)" />
              <button type="submit" className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">
                <Plus size={16} /> Ajouter
              </button>
            </form>
          </div>
          <div className="space-y-3">
            {agent.faqs.map(faq => (
              <div key={faq.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">Q: {faq.question}</div>
                    <div className="text-gray-600 text-sm mt-1">R: {faq.answer}</div>
                    <div className="text-xs text-gray-400 mt-1">{faq.hitCount} fois utilisé</div>
                  </div>
                  <button onClick={() => deleteFaq(faq.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition ml-2">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Produits */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4">Ajouter un produit</h2>
            <form onSubmit={addProduct} className="space-y-3">
              <input required value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800"
                placeholder="Nom du produit" />
              <div className="flex gap-3">
                <input required type="number" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800"
                  placeholder="Prix" />
                <select value={newProduct.currency} onChange={e => setNewProduct({ ...newProduct, currency: e.target.value })}
                  className="w-28 border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800">
                  <option>XOF</option><option>XAF</option><option>MAD</option><option>TND</option><option>USD</option>
                </select>
              </div>
              <input value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-800"
                placeholder="Description (optionnel)" />
              <button type="submit" className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">
                <Plus size={16} /> Ajouter
              </button>
            </form>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {agent.products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-800">{p.name}</div>
                  <div className="text-indigo-600 font-bold mt-1">{p.price.toLocaleString('fr-FR')} {p.currency}</div>
                  {p.description && <div className="text-gray-500 text-xs mt-1">{p.description}</div>}
                </div>
                <button onClick={() => deleteProduct(p.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: WhatsApp */}
      {tab === 'whatsapp' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-2">Connexion WhatsApp</h2>
          <p className="text-gray-500 text-sm mb-6">Entrez votre numéro WhatsApp pour lier ce numéro à l&apos;agent.</p>

          <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
            {agent.session?.status === 'CONNECTED' ? (
              <>
                <Wifi size={20} className="text-green-500" />
                <div>
                  <div className="font-medium text-gray-800">WhatsApp connecté</div>
                  <div className="text-sm text-gray-500">+{agent.session.phoneNumber}</div>
                </div>
              </>
            ) : (
              <>
                <WifiOff size={20} className="text-gray-400" />
                <div>
                  <div className="font-medium text-gray-800">Non connecté</div>
                  <div className="text-sm text-gray-500">Entrez votre numéro pour vous connecter</div>
                </div>
              </>
            )}
          </div>

          {agent.session?.status !== 'CONNECTED' && (
            <form onSubmit={connectWhatsApp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro WhatsApp</label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  placeholder="Ex: 22501234567 (avec indicatif pays)"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Incluez l&apos;indicatif pays sans le + (ex: 225 pour Côte d&apos;Ivoire)</p>
              </div>
              <button type="submit" disabled={loadingQr}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2">
                {loadingQr
                  ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> En cours...</>
                  : 'Connecter WhatsApp'}
              </button>
            </form>
          )}

          {pairingCode && (
            <div className="mt-6 text-center">
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-6">
                <div className="text-sm text-indigo-600 font-medium mb-2">Code de liaison WhatsApp</div>
                <div className="text-4xl font-bold tracking-widest text-indigo-800 mb-4">{pairingCode}</div>
                <div className="text-sm text-gray-600">
                  WhatsApp → <strong>Paramètres</strong> → <strong>Appareils liés</strong> → <strong>Lier un appareil</strong> → <strong>Lier avec numéro de téléphone</strong>
                </div>
              </div>
            </div>
          )}

          {pairingStatus && (
            <p className={`mt-4 text-sm text-center font-medium ${pairingStatus.includes('Connecté') ? 'text-green-600' : 'text-gray-500'}`}>
              {pairingStatus}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
