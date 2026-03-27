import { useEffect, useState } from 'react'
import { api, supabase } from '../lib/supabase' // Added supabase import
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, ShoppingCart, Users, Package, AlertTriangle, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="card stat-glow p-5 fade-up">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: '#666' }}>{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
             style={{ background: color + '18' }}>
          <Icon size={15} color={color} />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: '#666' }}>{sub}</p>}
    </div>
  )
}

function HealthScore({ score, label }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f97316' : score >= 40 ? '#eab308' : '#ef4444'
  const pct = (score / 100) * 283 
  return (
    <div className="card p-5 flex items-center gap-5">
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#1f1f1f" strokeWidth="8" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${pct} 283`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold">{score}</span>
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#666' }}>Business Health</p>
        <p className="font-bold text-base" style={{ color }}>{label}</p>
        <p className="text-xs mt-1" style={{ color: '#555' }}>Based on sales, inventory & customers</p>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs">
      <p style={{ color: '#888' }}>{label}</p>
      <p className="font-semibold" style={{ color: '#f97316' }}>₹{payload[0]?.value?.toLocaleString('en-IN')}</p>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Get the current session to get the token
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token

        if (!token) {
          toast.error("Not authenticated")
          return
        }

        // 2. Fetch both dashboard data and health score
        const [dResponse, hResponse] = await Promise.all([
          api.get('/dashboard', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          api.get('/dashboard/health-score', {
            headers: { Authorization: `Bearer ${token}` }
          }),
        ])

        setData(dResponse.data)
        setHealth(hResponse.data)
      } catch (e) {
        console.error("Dashboard Load Error:", e)
        toast.error('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  )

  const chartData = (data?.sales_last_7_days || []).map(d => ({
    day: format(new Date(d.day), 'EEE'),
    total: Number(d.total || 0)
  }))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: '#666' }}>
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
        </div>
        <button className="btn-brand text-xs flex items-center gap-2"
          onClick={() => navigate('/insights')}>
          <Sparkles size={13} /> Generate Insight
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="Today's Sales" icon={TrendingUp} color="#f97316"
          value={`₹${Number(data?.total_sales_today || 0).toLocaleString('en-IN')}`}
          sub="Revenue today" />
        <StatCard label="Monthly Sales" icon={TrendingUp} color="#8b5cf6"
          value={`₹${Number(data?.total_sales_month || 0).toLocaleString('en-IN')}`}
          sub="This month" />
        <StatCard label="Orders Today" icon={ShoppingCart} color="#06b6d4"
          value={data?.total_orders_today || 0}
          sub="Bills created" />
        <StatCard label="Customers" icon={Users} color="#22c55e"
          value={data?.total_customers || 0}
          sub="Total customers" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <StatCard label="Products" icon={Package} color="#f59e0b"
          value={data?.total_products || 0} sub="Active products" />
        <StatCard label="Low Stock" icon={AlertTriangle} color="#ef4444"
          value={data?.low_stock_count || 0} sub="Need restocking" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {health && <HealthScore score={health.total_score} label={health.label} />}

        <div className="card p-5">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: '#666' }}>Sales — last 7 days</p>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" stroke="#f97316" strokeWidth={2}
                    fill="url(#g)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data?.top_products?.length > 0 && (
        <div className="card p-5">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: '#666' }}>Top Products (30 days)</p>
          <div className="flex flex-col gap-2">
            {data.top_products.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2"
                   style={{ borderBottom: '1px solid #1a1a1a' }}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono w-5" style={{ color: '#444' }}>#{i + 1}</span>
                  <span className="text-sm font-medium">{p.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: '#f97316' }}>
                    ₹{Number(p.revenue).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs" style={{ color: '#555' }}>{p.units_sold} units</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}