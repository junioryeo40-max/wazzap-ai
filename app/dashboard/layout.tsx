import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const balance = await prisma.tokenBalance.findUnique({ where: { userId: user.id } })

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar user={user} balance={balance?.balance ?? 0} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
