'use client'
import { useState, useEffect, useCallback } from 'react'
import { Package } from 'lucide-react'

interface Order {
  id: string; customerPhone: string; customerName?: string; deliveryAddress?: string
  items: string; totalAmount: number; currency: string; status: string; createdAt: string
  agent: { name: string }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'En attente',  color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED:  { label: 'Confirmée',   color: 'bg-blue-100 text-blue-700' },
  PROCESSING: { label: 'En cours',    color: 'bg-purple-100 text-purple-700' },
  DELIVERED:  { label: 'Livrée',      color: 'bg-green-100 text-green-700' },
  CANCELLED:  { label: 'Annulée',     color: 'bg-red-100 text-red-700' },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)
  const [filter, setFilter] = useState('ALL')

  const fetchOrders = useCallback(async () => {
    const res = await fetch('/api/orders')
    const data = await res.json()
    setOrders(data.orders || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  async function updateStatus(orderId: string, status: string) {
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status })
    })
    fetchOrders()
    if (selected?.id === orderId) setSelected(prev => prev ? { ...prev, status } : null)
  }

  const filtered = filter === 'ALL' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Commandes</h1>
        <p className="text-gray-500 text-sm">{orders.length} commande{orders.length > 1 ? 's' : ''} au total</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {['ALL', ...Object.keys(STATUS_CONFIG)].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              filter === s ? 'bg-[#25D366] text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}>
            {s === 'ALL' ? 'Toutes' : STATUS_CONFIG[s].label}
            <span className="ml-1 text-xs opacity-70">
              ({s === 'ALL' ? orders.length : orders.filter(o => o.status === s).length})
            </span>
          </button>
        ))}
      </div>

      <div className={`${selected ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}`}>
        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl">
              <Package size={48} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">Aucune commande</p>
            </div>
          ) : (
            filtered.map(order => {
              const cfg = STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600' }
              let items: {name: string; qty: number; price: number}[] = []
              try { items = JSON.parse(order.items) } catch {}
              return (
                <div key={order.id}
                  onClick={() => setSelected(order === selected ? null : order)}
                  className={`bg-white rounded-2xl p-5 shadow-sm cursor-pointer transition hover:shadow-md ${selected?.id === order.id ? 'ring-2 ring-[#25D366]' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-gray-800">
                        #{order.id.slice(-6).toUpperCase()} · {order.customerName || order.customerPhone}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">{order.agent.name} · {new Date(order.createdAt).toLocaleDateString('fr-FR')}</div>
                      <div className="text-xs text-gray-400 mt-1">{items.length} article{items.length > 1 ? 's' : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-800">{order.totalAmount.toLocaleString('fr-FR')} {order.currency}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Detail */}
        {selected && (
          <div className="bg-white rounded-2xl p-6 shadow-sm h-fit sticky top-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-gray-800">Commande #{selected.id.slice(-6).toUpperCase()}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              <div><span className="text-gray-500">Client:</span> <span className="font-medium text-gray-800">{selected.customerName || 'N/A'}</span></div>
              <div><span className="text-gray-500">Téléphone:</span> <span className="font-medium text-gray-800">{selected.customerPhone}</span></div>
              {selected.deliveryAddress && <div><span className="text-gray-500">Adresse:</span> <span className="font-medium text-gray-800">{selected.deliveryAddress}</span></div>}
              <div><span className="text-gray-500">Agent:</span> <span className="font-medium text-gray-800">{selected.agent.name}</span></div>
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="font-medium text-gray-700 mb-2">Articles</div>
              {(() => {
                let items: {name: string; qty: number; price: number}[] = []
                try { items = JSON.parse(selected.items) } catch {}
                return items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                    <span className="text-gray-700">{item.name} × {item.qty}</span>
                    <span className="font-medium text-gray-800">{(item.price * item.qty).toLocaleString('fr-FR')}</span>
                  </div>
                ))
              })()}
              <div className="flex justify-between font-bold mt-2">
                <span>Total</span>
                <span className="text-[#25D366]">{selected.totalAmount.toLocaleString('fr-FR')} {selected.currency}</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="font-medium text-gray-700 mb-2 text-sm">Changer le statut</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    disabled={selected.status === s}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                      selected.status === s ? cfg.color + ' cursor-default' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
