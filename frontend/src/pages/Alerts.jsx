import { useEffect, useState } from 'react'
import { api } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Bell, AlertTriangle, Info, CheckCheck, TrendingDown, TrendingUp, Package, User } from 'lucide-react'

const ICON = {
  low_stock:         Package,
  demand_spike:      TrendingUp,
  demand_drop:       TrendingDown,
  customer_inactive: User,
  anomaly:           AlertTriangle,
  restock:           Package,
  system:            Info,
}

const SEV = {
  info:     { bg: '#3b82f622', color: '#3b82f6' },
  warning:  { bg: '#f9731622', color: '#f97316' },
  critical: { bg: '#ef444422', color: '#ef4444' },
}

export default function Alerts() {
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all') // all | unread

  const load = async () => {
    try {
      const res = await api.get('/alerts?limit=100')
      setAlerts(res.data || [])
    } catch { toast.error('Failed to load alerts') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const markRead = async (id) => {
    await api.put(`/alerts/${id}/read`)
    setAlerts(a => a.map(x => x.id === id ? { ...x, is_read: true } : x))
  }

  const markAllRead = async () => {
    await api.put('/alerts/read-all')
    setAlerts(a => a.map(x => ({ ...x, is_read: true })))
    toast.success('All alerts marked as read')
  }

  const filtered = filter === 'unread' ? alerts.filter(a => !a.is_read) : alerts
  const unreadCount = alerts.filter(a => !a.is_read).length

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell size={20} style={{ color: '#f97316' }} />
          <h1 className="text-xl font-bold">Alerts</h1>
          {unreadCount > 0 && (
            <span className="badge" style={{ background: '#ef444422', color: '#ef4444' }}>
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="btn-ghost text-xs flex items-center gap-2" onClick={markAllRead}>
            <CheckCheck size={13} /> Mark all read
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[['all', 'All'], ['unread', `Unread (${unreadCount})`]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filter === v ? '#f9731622' : '#111',
              color: filter === v ? '#f97316' : '#666',
              border: `1px solid ${filter === v ? '#f9731644' : '#242424'}`
            }}>
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell size={28} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm" style={{ color: '#555' }}>
            {filter === 'unread' ? 'No unread alerts' : 'No alerts yet'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(a => {
            const Icon = ICON[a.type] || Info
            const sev  = SEV[a.severity] || SEV.info
            return (
              <div key={a.id} className="card p-4 transition-all"
                   style={{ opacity: a.is_read ? 0.6 : 1 }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                       style={{ background: sev.bg }}>
                    <Icon size={14} style={{ color: sev.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{a.title}</p>
                      {!a.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full pulse flex-shrink-0"
                              style={{ background: sev.color }} />
                      )}
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#888' }}>{a.message}</p>
                    <p className="text-xs mt-2" style={{ color: '#444' }}>
                      {new Date(a.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  {!a.is_read && (
                    <button onClick={() => markRead(a.id)}
                      className="flex-shrink-0 text-xs px-2 py-1 rounded-md transition-colors"
                      style={{ color: '#555', background: '#1a1a1a' }}>
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
