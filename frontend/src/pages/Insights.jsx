import { useEffect, useState } from 'react'
import { api } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Sparkles, RefreshCw, Lock, ChevronRight, Gem } from 'lucide-react'

const TYPES = [
  { key: 'daily',     label: 'Daily Report',  desc: 'Today\'s performance & action plan' },
  { key: 'demand',    label: 'Demand Forecast', desc: 'What will sell next week' },
  { key: 'customer',  label: 'Customer Intel', desc: 'Retention & re-engagement' },
  { key: 'inventory', label: 'Inventory Health', desc: 'Restock & overstock alerts' },
]

function InsightCard({ insight }) {
  const [open, setOpen] = useState(false)
  let data = {}
  try { 
    data = typeof insight.content === 'string' ? JSON.parse(insight.content) : insight.content 
  } catch { 
    data = { summary: insight.content } 
  }

  return (
    <div className="card p-5 fade-up border border-[#1f1f1f] hover:border-[#333] transition-colors">
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
          <p className="font-semibold text-sm text-gray-100">{data.title || insight.title || 'AI Insight'}</p>
          {!open && data.summary && <p className="text-xs mt-1 line-clamp-1" style={{ color: '#777' }}>{data.summary}</p>}
        </div>
        <ChevronRight size={16} className={`ml-2 mt-1 transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`}
          style={{ color: '#555' }} />
      </div>

      {open && (
        <div className="mt-4 pt-4 flex flex-col gap-3" style={{ borderTop: '1px solid #1f1f1f' }}>
          {data.summary && <p className="text-xs leading-relaxed text-gray-400">{data.summary}</p>}
          
          {data.highlights?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2 text-green-500">Highlights</p>
              {data.highlights.map((h, i) => (
                <p key={i} className="text-xs py-1 flex gap-2 text-gray-300">
                  <span className="text-green-500">✓</span> {h}
                </p>
              ))}
            </div>
          )}

          {data.action_items?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2 text-gray-100">Recommended Actions</p>
              {data.action_items.map((a, i) => (
                <p key={i} className="text-xs py-2 px-3 rounded-lg mb-1 flex gap-2 bg-[#141414] text-gray-300">
                  <span className="text-gray-600 font-mono">{i + 1}.</span> {a}
                </p>
              ))}
            </div>
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
  const [plan, setPlan] = useState('free')

  const loadData = async () => {
    try {
      const [ins, sub] = await Promise.all([
        api.get('/insights'),
        api.get('/subscription/status').catch(() => ({ data: { plan: 'free' } })),
      ])
      setInsights(ins.data || [])
      setPlan(sub.data?.plan || 'free')
    } catch (e) { 
      toast.error('Failed to load insights') 
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const generate = async (type) => {
    setGenerating(type)
    try {
      await api.post('/insights/generate', { type })
      toast.success('AI Insight generated!', { icon: '✨' })
      loadData() // Refresh list
    } catch (e) {
      if (e.response?.status === 429) {
        toast.error("Daily limit reached 🚀 Upgrade to Premium for unlimited AI!", {
          duration: 5000,
          icon: '💎'
        })
      } else {
        toast.error(e.response?.data?.detail || "AI generation failed")
      }
    } finally {
      setGenerating(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Sparkles size={20} className="text-orange-500" />
          <h1 className="text-xl font-bold">AI Business Copilot</h1>
        </div>
        {plan === 'free' && (
          <button 
            onClick={() => window.location.href='/subscription'}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all"
          >
            <Gem size={10} /> Upgrade to Premium
          </button>
        )}
      </div>

      {/* Generate Grid - Now visible to all, but limited for free */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
        {TYPES.map(t => (
          <button 
            key={t.key} 
            onClick={() => generate(t.key)} 
            disabled={!!generating}
            className={`card p-4 text-left border border-[#1f1f1f] transition-all relative overflow-hidden group ${
              generating ? 'opacity-50 cursor-not-allowed' : 'hover:border-orange-500/40 active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold">{t.label}</p>
              {generating === t.key
                ? <RefreshCw size={14} className="animate-spin text-orange-500" />
                : <Sparkles size={14} className="text-orange-500 opacity-50 group-hover:opacity-100" />
              }
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">{t.desc}</p>
            {generating === t.key && (
              <div className="absolute bottom-0 left-0 h-0.5 bg-orange-500 animate-progress-fast" />
            )}
          </button>
        ))}
      </div>

      {/* History section */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-600">
          Insight History ({insights.length})
        </p>
      </div>

      {insights.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-[#1f1f1f]">
          <Sparkles size={24} className="mx-auto mb-3 text-gray-800" />
          <p className="text-sm text-gray-600">Click a report above to generate your first AI insight.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {insights.map(i => <InsightCard key={i.id} insight={i} />)}
        </div>
      )}
    </div>
  )
}