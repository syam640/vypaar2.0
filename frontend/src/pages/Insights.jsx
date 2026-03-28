import { useEffect, useState } from 'react'
import { api } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Sparkles, RefreshCw, ChevronRight, Gem, Loader2 } from 'lucide-react'

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
    <div className="card p-5 fade-up border border-[#1f1f1f] hover:border-[#333] transition-colors bg-[#0a0a0a]">
      <div className="flex items-start justify-between cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={13} className="text-orange-500" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-orange-500">
              {insight.type}
            </span>
            <span className="text-[10px] text-gray-600">
              {new Date(insight.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>
          <p className="font-bold text-sm text-gray-100">{data.title || insight.title || 'AI Strategy Insight'}</p>
          {!open && data.summary && <p className="text-xs mt-1 text-gray-500 line-clamp-1">{data.summary}</p>}
        </div>
        <ChevronRight size={16} className={`ml-2 mt-1 transition-transform flex-shrink-0 text-gray-600 ${open ? 'rotate-90' : ''}`} />
      </div>

      {open && (
        <div className="mt-4 pt-4 flex flex-col gap-4 border-t border-[#1f1f1f]">
          {data.summary && (
            <div className="bg-orange-500/5 p-3 rounded-lg border border-orange-500/10">
               <p className="text-xs leading-relaxed text-gray-300 italic">"{data.summary}"</p>
            </div>
          )}
          
          {data.highlights?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold mb-2 text-green-500">Key Highlights</p>
              {data.highlights.map((h, i) => (
                <p key={i} className="text-xs py-1 flex gap-2 text-gray-400">
                  <span className="text-green-500">✓</span> {h}
                </p>
              ))}
            </div>
          )}

          {data.action_items?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold mb-2 text-blue-400">Strategic Actions</p>
              {data.action_items.map((a, i) => (
                <p key={i} className="text-xs py-2 px-3 rounded-lg mb-1 flex gap-2 bg-[#141414] border border-[#1f1f1f] text-gray-300">
                  <span className="text-orange-500 font-mono font-bold">{i + 1}.</span> {a}
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
        api.get('/subscription/status').catch(() => ({ data: { plan: 'pro' } })), // Default to Pro for demo
      ])
      setInsights(ins.data || [])
      setPlan(sub.data?.plan || 'pro')
    } catch (e) { 
      console.error(e)
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const generate = async (type) => {
    setGenerating(type)
    const loadingToast = toast.loading("AI is scanning business data...", { icon: '🤖' })
    
    try {
      await api.post('/insights/generate', { type })
      toast.success('Strategy Insight Generated!', { id: loadingToast, icon: '✨' })
      loadData() 
    } catch (e) {
      toast.dismiss(loadingToast)
      if (e.response?.status === 429) {
        toast.error("Daily limit reached 🚀 Upgrade to Premium!", { duration: 4000, icon: '💎' })
      } else {
        toast.error("AI Brain is offline. Check API keys.")
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
          <Sparkles size={24} className="text-orange-500 animate-pulse" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">AI Business Copilot</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Autonomous Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
            Judge Demo Mode
        </div>
      </div>

      {/* Generate Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {TYPES.map(t => (
          <button 
            key={t.key} 
            onClick={() => generate(t.key)} 
            disabled={!!generating}
            className={`card p-5 text-left border border-[#1f1f1f] transition-all relative overflow-hidden group bg-[#0d0d0d] ${
              generating ? 'opacity-50 cursor-not-allowed' : 'hover:border-orange-500/40 hover:bg-[#111] active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-gray-100">{t.label}</p>
              {generating === t.key
                ? <Loader2 size={16} className="animate-spin text-orange-500" />
                : <Sparkles size={16} className="text-orange-500 opacity-40 group-hover:opacity-100 transition-opacity" />
              }
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed pr-4">{t.desc}</p>
            {generating === t.key && (
              <div className="absolute bottom-0 left-0 h-[2px] bg-orange-500 animate-progress-fast" style={{ width: '100%' }} />
            )}
          </button>
        ))}
      </div>

      {/* History section */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-600">
          Strategy History ({insights.length})
        </p>
      </div>

      {insights.length === 0 ? (
        <div className="card p-16 text-center border-dashed border-[#1f1f1f] bg-[#080808]">
          <Sparkles size={32} className="mx-auto mb-4 text-gray-800" />
          <p className="text-sm text-gray-500">Ready to optimize your business? <br/> Select a module above to begin analysis.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {insights.map(i => <InsightCard key={i.id} insight={i} />)}
        </div>
      )}
    </div>
  )
}