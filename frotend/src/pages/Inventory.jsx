import { useEffect, useState } from 'react'
import { api } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Package, Plus, Edit2, Trash2, AlertTriangle, Check, X } from 'lucide-react'

const EMPTY = { name: '', price: '', stock: '', category: 'General', unit: 'piece', threshold: 10, description: '' }

export default function Inventory() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null) // null | 'add' | product object
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [filter, setFilter]     = useState('all') // all | low

  const load = async () => {
    try {
      const res = await api.get('/products')
      setProducts(res.data || [])
    } catch { toast.error('Failed to load products') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openAdd  = () => { setForm(EMPTY); setModal('add') }
  const openEdit = (p) => { setForm({ ...p }); setModal(p) }
  const closeModal = () => setModal(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name || !form.price) return toast.error('Name and price are required')
    setSaving(true)
    try {
      if (modal === 'add') {
        await api.post('/products/add', {
          name: form.name, price: Number(form.price), stock: Number(form.stock),
          category: form.category, unit: form.unit,
          threshold: Number(form.threshold), description: form.description
        })
        toast.success('Product added!')
      } else {
        await api.put(`/products/${modal.id}`, {
          name: form.name, price: Number(form.price), stock: Number(form.stock),
          category: form.category, unit: form.unit,
          threshold: Number(form.threshold), description: form.description
        })
        toast.success('Product updated!')
      }
      closeModal(); load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    try {
      await api.delete(`/products/${id}`)
      toast.success('Deleted')
      load()
    } catch (e) { toast.error(e.message) }
  }

  const filtered = filter === 'low'
    ? products.filter(p => p.stock <= p.threshold)
    : products

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package size={20} style={{ color: '#f97316' }} />
          <h1 className="text-xl font-bold">Inventory</h1>
          <span className="badge" style={{ background: '#f9731622', color: '#f97316' }}>
            {products.length} items
          </span>
        </div>
        <button className="btn-brand text-sm flex items-center gap-2" onClick={openAdd}>
          <Plus size={14} /> Add Product
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[['all', 'All Products'], ['low', `Low Stock (${products.filter(p => p.stock <= p.threshold).length})`]].map(([v, l]) => (
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

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #1f1f1f' }}>
              {['Product', 'Category', 'Price', 'Stock', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-widest"
                    style={{ color: '#555' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: '#555' }}>
                No products found
              </td></tr>
            ) : filtered.map(p => {
              const isLow = p.stock <= p.threshold
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #141414' }}
                    className="transition-colors hover:bg-[#161616]">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.description && <p className="text-xs mt-0.5 truncate max-w-[180px]" style={{ color: '#555' }}>{p.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge" style={{ background: '#1f1f1f', color: '#888' }}>{p.category}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm" style={{ color: '#f97316' }}>
                    ₹{Number(p.price).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm">{p.stock}</span>
                    <span className="text-xs ml-1" style={{ color: '#555' }}>{p.unit}</span>
                  </td>
                  <td className="px-4 py-3">
                    {isLow ? (
                      <span className="badge" style={{ background: '#ef444422', color: '#ef4444' }}>
                        <AlertTriangle size={9} /> Low
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#22c55e22', color: '#22c55e' }}>
                        <Check size={9} /> OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: '#1a1a1a' }}>
                        <Edit2 size={12} style={{ color: '#888' }} />
                      </button>
                      <button onClick={() => handleDelete(p.id, p.name)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: '#1a1a1a' }}>
                        <Trash2 size={12} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: '#000000bb' }}>
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold">{modal === 'add' ? 'Add Product' : 'Edit Product'}</h2>
              <button onClick={closeModal} className="opacity-50 hover:opacity-100"><X size={18} /></button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs mb-1 block" style={{ color: '#888' }}>Product Name *</label>
                  <input className="input" placeholder="Basmati Rice 5kg" value={form.name}
                         onChange={e => set('name', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#888' }}>Price ₹ *</label>
                  <input className="input" type="number" min={0} placeholder="320" value={form.price}
                         onChange={e => set('price', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#888' }}>Stock</label>
                  <input className="input" type="number" min={0} placeholder="50" value={form.stock}
                         onChange={e => set('stock', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#888' }}>Category</label>
                  <input className="input" placeholder="Grocery" value={form.category}
                         onChange={e => set('category', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#888' }}>Unit</label>
                  <select className="input" value={form.unit} onChange={e => set('unit', e.target.value)}
                          style={{ background: '#111' }}>
                    {['piece', 'kg', 'g', 'litre', 'ml', 'pack', 'box', 'dozen'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: '#888' }}>Low Stock Alert Below</label>
                  <input className="input" type="number" min={0} value={form.threshold}
                         onChange={e => set('threshold', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs mb-1 block" style={{ color: '#888' }}>Description (optional)</label>
                  <input className="input" placeholder="Short description" value={form.description || ''}
                         onChange={e => set('description', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="btn-ghost flex-1 text-sm">Cancel</button>
              <button onClick={handleSave} className="btn-brand flex-1 text-sm" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
