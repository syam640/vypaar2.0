import { useEffect, useState } from 'react'
import { api } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Trash2, Receipt, Search } from 'lucide-react'

export default function Billing() {
  const [products, setProducts]   = useState([])
  const [customers, setCustomers] = useState([])
  const [items, setItems]         = useState([{ product_id: '', quantity: 1, unit_price: 0, discount: 0 }])
  const [customer_id, setCustomer] = useState('')
  const [payment_mode, setPayment] = useState('cash')
  const [loading, setLoading]     = useState(false)
  const [history, setHistory]     = useState([])
  const [tab, setTab]             = useState('create') // create | history

  useEffect(() => {
    api.get('/products').then(r => setProducts(r.data || []))
    api.get('/customers').then(r => setCustomers(r.data || []))
    api.get('/bill/history').then(r => setHistory(r.data || []))
  }, [])

  const addItem = () => setItems(i => [...i, { product_id: '', quantity: 1, unit_price: 0, discount: 0 }])

  const removeItem = (idx) => setItems(i => i.filter((_, j) => j !== idx))

  const updateItem = (idx, key, val) => {
    setItems(items => items.map((item, j) => {
      if (j !== idx) return item
      const updated = { ...item, [key]: val }
      if (key === 'product_id') {
        const p = products.find(p => p.id === val)
        if (p) updated.unit_price = p.price
      }
      return updated
    }))
  }

  const total = items.reduce((sum, it) => {
    const line = it.unit_price * it.quantity
    return sum + line - (line * (it.discount / 100))
  }, 0)

  const handleSubmit = async () => {
    if (items.some(i => !i.product_id)) return toast.error('Please select a product for all items')
    setLoading(true)
    try {
      const res = await api.post('/bill/create', {
        customer_id: customer_id || null,
        items: items.map(i => ({
          product_id: i.product_id,
          quantity:   Number(i.quantity),
          unit_price: Number(i.unit_price),
          discount:   Number(i.discount),
        })),
        payment_mode,
      })
      toast.success(`Bill #${res.data.bill_id.slice(-6).toUpperCase()} created! ₹${res.data.total_amount}`)
      setItems([{ product_id: '', quantity: 1, unit_price: 0, discount: 0 }])
      setCustomer('')
      // Refresh history
      api.get('/bill/history').then(r => setHistory(r.data || []))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Receipt size={20} style={{ color: '#f97316' }} />
        <h1 className="text-xl font-bold">Billing</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg mb-6 w-fit" style={{ background: '#111' }}>
        {['create', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize"
            style={{
              background: tab === t ? '#1e1e1e' : 'transparent',
              color: tab === t ? '#f5f5f5' : '#666',
            }}>
            {t === 'create' ? 'Create Bill' : 'History'}
          </button>
        ))}
      </div>

      {tab === 'create' ? (
        <div className="card p-6 flex flex-col gap-5">
          {/* Customer */}
          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: '#888' }}>Customer (optional)</label>
            <select className="input" value={customer_id} onChange={e => setCustomer(e.target.value)}
                    style={{ background: '#111' }}>
              <option value="">Walk-in customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `— ${c.phone}` : ''}</option>)}
            </select>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium" style={{ color: '#888' }}>Items</label>
              <button onClick={addItem} className="btn-ghost text-xs flex items-center gap-1 py-1 px-3">
                <Plus size={12} /> Add Item
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs px-1" style={{ color: '#555' }}>
                <span className="col-span-5">Product</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-2 text-center">Price ₹</span>
                <span className="col-span-2 text-center">Disc%</span>
                <span className="col-span-1" />
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select className="input col-span-5 text-sm" value={item.product_id}
                    onChange={e => updateItem(idx, 'product_id', e.target.value)}
                    style={{ background: '#111' }}>
                    <option value="">Select...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                    ))}
                  </select>
                  <input type="number" className="input col-span-2 text-center text-sm" min={1}
                    value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                  <input type="number" className="input col-span-2 text-center text-sm" min={0}
                    value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                  <input type="number" className="input col-span-2 text-center text-sm" min={0} max={100}
                    value={item.discount} onChange={e => updateItem(idx, 'discount', e.target.value)} />
                  <button onClick={() => removeItem(idx)} disabled={items.length === 1}
                    className="col-span-1 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity">
                    <Trash2 size={13} color="#ef4444" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Payment mode */}
          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: '#888' }}>Payment Mode</label>
            <div className="flex gap-2 flex-wrap">
              {['cash', 'upi', 'card', 'credit'].map(mode => (
                <button key={mode} onClick={() => setPayment(mode)}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all"
                  style={{
                    background: payment_mode === mode ? '#f9731622' : '#111',
                    color: payment_mode === mode ? '#f97316' : '#666',
                    border: `1px solid ${payment_mode === mode ? '#f97316' : '#242424'}`
                  }}>
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Total + Submit */}
          <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid #1f1f1f' }}>
            <div>
              <p className="text-xs" style={{ color: '#666' }}>Total Amount</p>
              <p className="text-2xl font-bold" style={{ color: '#f97316' }}>
                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <button className="btn-brand" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Bill'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-5">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: '#666' }}>Recent Bills</p>
          {history.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#555' }}>No bills yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map(b => (
                <div key={b.bill_id} className="flex items-center justify-between py-3"
                     style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <div>
                    <p className="text-sm font-mono font-medium">#{b.bill_id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#555' }}>
                      {b.customer_name || 'Walk-in'} · {b.items} item{b.items > 1 ? 's' : ''} · {b.payment_mode?.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" style={{ color: '#f97316' }}>
                      ₹{Number(b.total).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs" style={{ color: '#555' }}>
                      {b.timestamp ? new Date(b.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
