import { useEffect, useState } from 'react'
import { api } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Sparkles, RefreshCw, Lock, ChevronRight } from 'lucide-react'

const TYPES = [
  { key: 'daily',     label: 'Daily Report',  desc: 'Today\'s performance & action plan' },
  { key: 'demand',    label: 'Demand Forecast', desc: 'What will sell next week' },
  { key: 'customer',  label: 'Customer Intel', desc: 'Retention & re-engagement' },
  { key: 'inventory', label: 'Inventory Health', desc: 'Restock & overstock alerts' },
]

function InsightCard({ insight }) {
  const [open, setOpen] = useState(false)
  let data = {}
  try { data = JSON.parse(insight.content) } catch { data = { summary: insight.content } }

  return (
    <div className="card p-5 fade-up">
      <div className="flex items-start justify-between cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={13} style={{ color: '#f97316' }} />
            <span className="text-xs uppercase tracking-widest font-medium" style={{ color: '#f97316' }}>
              {insight.type}
            </span>
            <span className="text-xs" style={{ color: '#444' }}>
              {new Date(insight.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>
          <p className="font-semibold text-sm">{data.title || insight.title || 'AI Insight'}</p>
          {data.summary && <p className="text-xs mt-1 line-clamp-2" style={{ color: '#777' }}>{data.summary}</p>}
        </div>
        <ChevronRight size={16} className={`ml-2 mt-1 transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`}
          style={{ color: '#555' }} />
      </div>

      {open && (
        <div className="mt-4 pt-4 flex flex-col gap-3" style={{ borderTop: '1px solid #1f1f1f' }}>
          {data.highlights?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: '#22c55e' }}>Highlights</p>
              {data.highlights.map((h, i) => (
                <p key={i} className="text-xs py-1 flex gap-2" style={{ color: '#ccc' }}>
                  <span style={{ color: '#22c55e' }}>✓</span> {h}
                </p>
              ))}
            </div>
          )}
          {data.warnings?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: '#f97316' }}>Warnings</p>
              {data.warnings.map((w, i) => (
                <p key={i} className="text-xs py-1 flex gap-2" style={{ color: '#ccc' }}>
                  <span style={{ color: '#f97316' }}>⚠</span> {w}
                </p>
              ))}
            </div>
          )}
          {data.action_items?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: '#f5f5f5' }}>Action Items</p>
              {data.action_items.map((a, i) => (
                <p key={i} className="text-xs py-1.5 px-3 rounded-lg mb-1 flex gap-2"
                   style={{ background: '#1a1a1a', color: '#ccc' }}>
                  <span className="font-mono text-xs" style={{ color: '#555' }}>{i + 1}.</span> {a}
                </p>
              ))}
            </div>
          )}
          {data.tomorrow_focus && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#f9731611', color: '#f97316' }}>
              Tomorrow: {data.tomorrow_focus}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function Insights() {
  const [insights, setInsights]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [generating, setGenerating] = useState(null)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [ins, sub] = await Promise.all([
          api.get('/insights'),
          api.get('/subscription/status'),
        ])
        setInsights(ins.data || [])
        setIsPremium(sub.data?.plan === 'premium')
      } catch { toast.error('Failed to load') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const generate = async (type) => {
    setGenerating(type)
    try {
      const res = await api.post('/insights/generate', { type })
      if (res.data?.upgrade_required) {
        toast.error('Upgrade to Premium for AI Insights')
        return
      }
      toast.success('Insight generated!')
      const updated = await api.get('/insights')
      setInsights(updated.data || [])
    } catch (e) { toast.error(e.message) }
    finally { setGenerating(null) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles size={20} style={{ color: '#f97316' }} />
        <h1 className="text-xl font-bold">AI Insights</h1>
        {!isPremium && (
          <span className="badge" style={{ background: '#8b5cf622', color: '#8b5cf6' }}>
            <Lock size={9} /> Premium
          </span>
        )}
      </div>

      {!isPremium ? (
        <div className="card p-8 text-center mb-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
               style={{ background: '#8b5cf622' }}>
            <Lock size={20} style={{ color: '#8b5cf6' }} />
          </div>
          <p className="font-semibold mb-2">AI Insights is a Premium Feature</p>
          <p className="text-sm mb-4" style={{ color: '#666' }}>
            Upgrade to get daily AI reports, demand forecasts, and customer intelligence powered by GPT-4.
          </p>
          <a href="/subscription" className="btn-brand inline-block text-sm">Upgrade Now — ₹499/mo</a>
        </div>
      ) : (
        // Generate buttons
        <div className="grid grid-cols-2 gap-3 mb-6">
          {TYPES.map(t => (
            <button key={t.key} onClick={() => generate(t.key)} disabled={!!generating}
              className="card p-4 text-left transition-all hover:border-orange-500/30"
              style={{ cursor: generating ? 'not-allowed' : 'pointer' }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold">{t.label}</p>
                {generating === t.key
                  ? <RefreshCw size={13} className="animate-spin" style={{ color: '#f97316' }} />
                  : <Sparkles size={13} style={{ color: '#f97316' }} />
                }
              </div>
              <p className="text-xs" style={{ color: '#666' }}>{t.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* Past insights */}
      <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#555' }}>
        Past Insights ({insights.length})
      </p>
      {insights.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm" style={{ color: '#555' }}>No insights generated yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {insights.map(i => <InsightCard key={i.id} insight={i} />)}
        </div>
      )}
    </div>
  )
}
