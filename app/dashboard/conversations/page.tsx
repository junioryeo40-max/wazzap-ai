'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageSquare, Send, Plus, Bot, X, Zap } from 'lucide-react'

interface Conversation {
  customerPhone: string
  agentId: string
  _max: { createdAt: string }
  _count: { id: number }
}

interface Message {
  id: string; direction: string; content: string
  tokensUsed: number; source: string; createdAt: string
}

interface Agent { id: string; name: string }

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedConv, setSelectedConv] = useState<{ phone: string; agentId: string; agentName: string } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [demoMsg, setDemoMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ agentId: '', phone: '221700000001' })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchAll = useCallback(async () => {
    const [convRes, agentRes] = await Promise.all([
      fetch('/api/messages'),
      fetch('/api/agents')
    ])
    const convData = await convRes.json()
    const agentData = await agentRes.json()
    setConversations(convData.conversations || [])
    setAgents(agentData.agents || [])
    if (!newForm.agentId && agentData.agents?.length > 0) {
      setNewForm(f => ({ ...f, agentId: agentData.agents[0].id }))
    }
    setLoading(false)
  }, [newForm.agentId])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function selectConv(phone: string, agentId: string) {
    const agent = agents.find(a => a.id === agentId)
    setSelectedConv({ phone, agentId, agentName: agent?.name || agentId })
    const res = await fetch(`/api/messages?phone=${encodeURIComponent(phone)}&agentId=${agentId}`)
    const data = await res.json()
    setMessages(data.messages || [])
  }

  async function startNewConversation(e: React.FormEvent) {
    e.preventDefault()
    if (!newForm.agentId || !newForm.phone) return
    setShowNew(false)
    await selectConv(newForm.phone, newForm.agentId)
  }

  async function sendDemoMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedConv || !demoMsg.trim() || sending) return
    setSending(true)
    const text = demoMsg
    setDemoMsg('')

    // Afficher le message client immédiatement (optimistic)
    const tempMsg: Message = {
      id: 'tmp-' + Date.now(), direction: 'INBOUND', content: text,
      tokensUsed: 0, source: 'AI', createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMsg])

    const res = await fetch('/api/messages/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: selectedConv.agentId, phone: selectedConv.phone, message: text })
    })

    if (res.ok) {
      // Recharger les vrais messages depuis la DB
      const msgRes = await fetch(`/api/messages?phone=${encodeURIComponent(selectedConv.phone)}&agentId=${selectedConv.agentId}`)
      const data = await msgRes.json()
      setMessages(data.messages || [])
      // Mettre à jour la liste des conversations
      const convRes = await fetch('/api/messages')
      const convData = await convRes.json()
      setConversations(convData.conversations || [])
    }
    setSending(false)
  }

  const sourceColor: Record<string, string> = {
    FAQ: 'bg-blue-100 text-blue-700',
    RAG: 'bg-purple-100 text-purple-700',
    AI: 'bg-green-100 text-green-700',
  }
  const sourceLabel: Record<string, string> = { FAQ: 'FAQ', RAG: 'Base de données', AI: 'IA' }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Conversations</h1>
          <p className="text-gray-500 text-sm">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
        </div>
        {agents.length > 0 && (
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2.5 rounded-xl font-medium hover:bg-[#1da851] transition text-sm">
            <Plus size={16} /> Simuler une conversation
          </button>
        )}
      </div>

      {/* Modal nouvelle conversation */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-800">Simuler une conversation</h2>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={startNewConversation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent IA</label>
                <select value={newForm.agentId} onChange={e => setNewForm({ ...newForm, agentId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#25D366] text-gray-800">
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro client (fictif)</label>
                <input value={newForm.phone} onChange={e => setNewForm({ ...newForm, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#25D366] text-gray-800"
                  placeholder="Ex: 221700000001" />
                <p className="text-xs text-gray-400 mt-1">Ce numéro simule un client WhatsApp</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowNew(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg hover:bg-gray-50 text-sm">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 bg-[#25D366] text-white py-2.5 rounded-lg font-medium hover:bg-[#1da851] text-sm">
                  Démarrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: 'calc(100vh - 220px)' }}>
        {/* Liste conversations */}
        <div className="bg-white rounded-2xl shadow-sm overflow-y-auto flex flex-col">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare size={28} className="text-gray-300" />
              </div>
              <p className="font-medium text-gray-600 mb-1">Aucune conversation</p>
              <p className="text-xs text-gray-400 mb-5">
                {agents.length === 0
                  ? 'Créez d\'abord un agent dans "Mes Agents"'
                  : 'Simulez une conversation pour tester votre agent'}
              </p>
              {agents.length > 0 && (
                <button onClick={() => setShowNew(true)}
                  className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-medium">
                  <Plus size={14} /> Simuler
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conv, i) => {
                const agent = agents.find(a => a.id === conv.agentId)
                return (
                  <button key={i} onClick={() => selectConv(conv.customerPhone, conv.agentId)}
                    className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition ${
                      selectedConv?.phone === conv.customerPhone && selectedConv?.agentId === conv.agentId
                        ? 'bg-green-50 border-r-2 border-[#25D366]' : ''
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#075E54] rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {conv.customerPhone.slice(-2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 text-sm truncate">+{conv.customerPhone}</div>
                        <div className="text-xs text-gray-400 truncate">{agent?.name || conv.agentId}</div>
                      </div>
                      <div className="text-xs text-gray-400 shrink-0">
                        {conv._count.id}m
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Zone messages */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Bot size={48} className="mx-auto mb-3 text-gray-200" />
                <p className="font-medium text-gray-500">Sélectionnez une conversation</p>
                <p className="text-sm text-gray-400 mt-1">ou simulez-en une nouvelle</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#075E54] rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {selectedConv.phone.slice(-2)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">+{selectedConv.phone}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <Bot size={11} /> {selectedConv.agentName}
                    </div>
                  </div>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full flex items-center gap-1">
                  <Zap size={10} /> Mode démo
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Écris un message pour tester l&apos;agent IA 👇
                  </div>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-sm ${msg.direction === 'OUTBOUND' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {msg.direction === 'INBOUND' && (
                        <span className="text-xs text-gray-400 ml-1">Client</span>
                      )}
                      {msg.direction === 'OUTBOUND' && (
                        <span className="text-xs text-gray-400 mr-1 text-right">{selectedConv.agentName}</span>
                      )}
                      <div className={`rounded-2xl px-4 py-2.5 ${
                        msg.direction === 'OUTBOUND'
                          ? 'bg-[#DCF8C6] text-gray-800 rounded-tr-sm'
                          : 'bg-white text-gray-800 rounded-tl-sm shadow-sm'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.tokensUsed > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${sourceColor[msg.source] || 'bg-gray-100 text-gray-500'}`}>
                              {sourceLabel[msg.source] || msg.source} · {msg.tokensUsed} tokens
                            </span>
                          )}
                          {msg.tokensUsed === 0 && msg.direction === 'OUTBOUND' && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                              FAQ · gratuit
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-end">
                    <div className="bg-[#DCF8C6] rounded-2xl rounded-tr-sm px-4 py-2.5">
                      <div className="flex gap-1 items-center">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Barre d'envoi */}
              <form onSubmit={sendDemoMessage} className="p-4 border-t border-gray-100 bg-white flex gap-2">
                <input
                  value={demoMsg}
                  onChange={e => setDemoMsg(e.target.value)}
                  disabled={sending}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] text-gray-800 bg-gray-50 disabled:opacity-60"
                  placeholder="Écris un message comme si tu étais un client..."
                />
                <button
                  type="submit"
                  disabled={sending || !demoMsg.trim()}
                  className="bg-[#25D366] text-white p-2.5 rounded-xl hover:bg-[#1da851] transition disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
