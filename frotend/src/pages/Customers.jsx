import { useEffect, useState } from 'react'
import { api } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Users, Plus, X, RefreshCw } from 'lucide-react'

const SEGMENT_STYLE = {
  loyal:    { bg: '#22c55e22', color: '#22c55e', label: 'Loyal' },
  at_risk:  { bg: '#f9731622', color: '#f97316', label: 'At Risk' },
  new:      { bg: '#3b82f622', color: '#3b82f6', label: 'New' },
  lost:     { bg: '#ef444422', color: '#ef4444', label: 'Lost' },
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [segments, setSegments]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [segLoading, setSegLoading] = useState(false)
  const [filter, setFilter]       = useState('all')
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState({ name: '', phone: '', email: '', address: '' })
  const [saving, setSaving]       = useState(false)

  const load = async () => {
    try {
      const res = await api.get('/customers')
      setCustomers(res.data || [])
    } catch { toast.error('Failed to load customers') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleRunSegments = async () => {
    setSegLoading(true)
    try {
      const res = await api.get('/customers/segments')
      setSegments(res.data?.segment_counts || {})
      toast.success('Customer segments updated!')
      load() // Refresh to get updated segments
    } catch (e) { toast.error(e.message) }
    finally { setSegLoading(false) }
  }

  const handleAdd = async () => {
    if (!form.name) return toast.error('Name is required')
    setSaving(true)
    try {
      await api.post('/customers/add', form)
      toast.success('Customer added!')
      setModal(false)
      setForm({ name: '', phone: '', email: '', address: '' })
      load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const filtered = filter === 'all' ? customers : customers.filter(c => c.segment === filter)

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users size={20} style={{ color: '#f97316' }} />
          <h1 className="text-xl font-bold">Customers</h1>
          <span className="badge" style={{ background: '#f9731622', color: '#f97316' }}>
            {customers.length}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRunSegments} disabled={segLoading}
            className="btn-ghost text-xs flex items-center gap-2">
            <RefreshCw size={12} className={segLoading ? 'animate-spin' : ''} />
            Run AI Segments
          </button>
          <button className="btn-brand text-sm flex items-center gap-2" onClick={() => setModal(true)}>
            <Plus size={14} /> Add Customer
          </button>
        </div>
      </div>

      {/* Segment summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {Object.entries(SEGMENT_STYLE).map(([key, s]) => {
          const count = customers.filter(c => c.segment === key).length
          return (
            <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)}
              className="card p-4 text-left transition-all"
              style={{ border: filter === key ? `1px solid ${s.color}` : undefined }}>
              <p className="text-lg font-bold" style={{ color: s.color }}>{count}</p>
              <p className="text-xs mt-0.5" style={{ color: '#666' }}>{s.label}</p>
            </button>
          )
        })}
      </div>

      {/* Customer list */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #1f1f1f' }}>
              {['Name', 'Phone', 'Total Spent', 'Purchases', 'Last Buy', 'Segment'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-widest"
                    style={{ color: '#555' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: '#555' }}>
                No customers yet
              </td></tr>
            ) : filtered.map(c => {
              const seg = SEGMENT_STYLE[c.segment] || SEGMENT_STYLE.new
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #141414' }}
                    className="hover:bg-[#161616] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.email && <p className="text-xs" style={{ color: '#555' }}>{c.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: '#888' }}>{c.phone || '—'}</td>
                  <td className="px-4 py-3 font-mono text-sm" style={{ color: '#f97316' }}>
                    ₹{Number(c.total_spent || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">{c.frequency || 0}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: '#666' }}>
                    {c.last_purchase
                      ? new Date(c.last_purchase).toLocaleDateString('en-IN')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge" style={{ background: seg.bg, color: seg.color }}>
                      {seg.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: '#000000bb' }}>
          <div className="card p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold">Add Customer</h2>
              <button onClick={() => setModal(false)}><X size={18} className="opacity-40" /></button>
            </div>
            <div className="flex flex-col gap-3">
              {[['name', 'Full Name *', 'Ramesh Kumar'], ['phone', 'Phone', '9876543210'],
                ['email', 'Email', 'ramesh@example.com'], ['address', 'Address', 'Shop #12, Main Bazar']
              ].map(([k, l, ph]) => (
                <div key={k}>
                  <label className="text-xs mb-1 block" style={{ color: '#888' }}>{l}</label>
                  <input className="input" placeholder={ph} value={form[k]}
                         onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="btn-ghost flex-1 text-sm">Cancel</button>
              <button onClick={handleAdd} className="btn-brand flex-1 text-sm" disabled={saving}>
                {saving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
