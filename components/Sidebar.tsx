'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Bot, MessageSquare, ShoppingBag, Coins, LogOut } from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/agents', label: 'Mes Agents', icon: Bot },
  { href: '/dashboard/conversations', label: 'Conversations', icon: MessageSquare },
  { href: '/dashboard/orders', label: 'Commandes', icon: ShoppingBag },
  { href: '/dashboard/tokens', label: 'Tokens', icon: Coins },
]

interface Props {
  user: { id: string; email: string; name: string | null }
  balance: number
}

export default function Sidebar({ user, balance }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 bg-slate-900 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">C</div>
          <div>
            <div className="text-white font-bold text-lg leading-none">ChatFlow</div>
            <div className="text-white/40 text-xs mt-0.5">Tableau de bord</div>
          </div>
        </div>
      </div>

      {/* Token balance */}
      <div className="mx-4 my-4 bg-white/5 rounded-xl px-4 py-3">
        <div className="text-white/50 text-xs mb-1">Tokens disponibles</div>
        <div className="text-white text-2xl font-bold">{balance.toLocaleString('fr-FR')}</div>
        {balance < 500 && (
          <Link href="/dashboard/tokens" className="text-amber-400 text-xs mt-1 block hover:underline">
            ⚠️ Solde faible — Recharger
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
            {(user.name || user.email)[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{user.name || 'Utilisateur'}</div>
            <div className="text-white/40 text-xs truncate">{user.email}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition text-sm"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
