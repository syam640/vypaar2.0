import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Receipt, Package, Users,
  Sparkles, Bell, CreditCard, LogOut, Zap
} from 'lucide-react'

const nav = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/billing',      icon: Receipt,          label: 'Billing' },
  { to: '/inventory',    icon: Package,           label: 'Inventory' },
  { to: '/customers',    icon: Users,             label: 'Customers' },
  { to: '/insights',     icon: Sparkles,          label: 'AI Insights' },
  { to: '/alerts',       icon: Bell,              label: 'Alerts' },
  { to: '/subscription', icon: CreditCard,        label: 'Upgrade' },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#0c0c0c', borderRight: '1px solid #1f1f1f', flexShrink: 0 }}
             className="flex flex-col py-5 px-3">
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 mb-8">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
               style={{ background: '#f97316' }}>
            <Zap size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-sm tracking-tight" style={{ color: '#f5f5f5' }}>
            Vyapaar AI
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + signout */}
        <div style={{ borderTop: '1px solid #1f1f1f', paddingTop: 12 }}>
          <div className="px-3 mb-2">
            <p className="text-xs font-medium truncate" style={{ color: '#f5f5f5' }}>
              {user?.user_metadata?.full_name || 'My Business'}
            </p>
            <p className="text-xs truncate" style={{ color: '#555' }}>{user?.email}</p>
          </div>
          <button onClick={handleSignOut}
            className="nav-item w-full text-left"
            style={{ color: '#ef4444' }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto" style={{ background: '#0f0f0f' }}>
        <Outlet />
      </main>
    </div>
  )
}
