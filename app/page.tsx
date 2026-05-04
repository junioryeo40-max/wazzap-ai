import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">C</div>
          <span className="text-white text-xl font-bold">ChatFlow</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="text-white/70 hover:text-white px-4 py-2 rounded-lg transition">
            Connexion
          </Link>
          <Link href="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium">
            Commencer
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block bg-indigo-500/20 text-indigo-300 px-4 py-1 rounded-full text-sm font-medium mb-6">
          Conçu pour le marché africain
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Votre agent WhatsApp IA<br />en 5 minutes
        </h1>
        <p className="text-white/60 text-xl mb-10 max-w-2xl mx-auto">
          Automatisez votre service client, vos ventes et vos commandes sur WhatsApp.
          Payez uniquement ce que vous utilisez — pas d&apos;abonnement.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="bg-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-indigo-700 transition shadow-lg">
            Créer mon agent gratuit
          </Link>
          <Link href="/login" className="border border-white/20 text-white px-8 py-4 rounded-xl text-lg hover:bg-white/5 transition">
            Se connecter
          </Link>
        </div>
      </div>

      {/* Packs tokens */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-white text-2xl font-bold text-center mb-8">Packs Tokens — Paiement Wave</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Starter', tokens: '20 000', price: '2 500', currency: 'FCFA', desc: 'Idéal pour démarrer', color: 'from-slate-700 to-slate-600' },
            { name: 'Business', tokens: '100 000', price: '10 000', currency: 'FCFA', desc: 'Pour les PME actives', color: 'from-indigo-700 to-indigo-600', popular: true },
            { name: 'Pro', tokens: '300 000', price: '25 000', currency: 'FCFA', desc: 'Pour les grandes entreprises', color: 'from-violet-700 to-violet-600' },
          ].map((pack) => (
            <div key={pack.name} className={`bg-gradient-to-br ${pack.color} rounded-2xl p-6 text-white relative`}>
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                  POPULAIRE
                </div>
              )}
              <div className="text-lg font-bold mb-1">{pack.name}</div>
              <div className="text-4xl font-bold mb-1">{pack.price}</div>
              <div className="text-white/70 text-sm mb-4">{pack.currency}</div>
              <div className="text-2xl font-semibold mb-1">{pack.tokens}</div>
              <div className="text-white/60 text-sm mb-4">tokens</div>
              <div className="text-white/50 text-xs">{pack.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-white/5 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { icon: '🤖', label: 'Agent IA no-code' },
            { icon: '📦', label: 'Gestion commandes' },
            { icon: '📊', label: 'Dashboard temps réel' },
            { icon: '💳', label: 'Paiement Wave' },
          ].map((f) => (
            <div key={f.label} className="text-white">
              <div className="text-4xl mb-3">{f.icon}</div>
              <div className="font-medium text-white/80">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
