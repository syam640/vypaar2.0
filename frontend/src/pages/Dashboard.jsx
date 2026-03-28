import { useEffect, useState, useRef } from 'react'
import { api, supabase } from '../lib/supabase'
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

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const hasFetched = useRef(false)

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    const fetchData = async () => {
      try {
        // 1. Get Supabase Session
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token

        if (!token) {
          toast.error("Please login first")
          navigate('/login')
          return
        }

        // 2. FETCH DASHBOARD (Hardcoded URL to avoid 404)
        const dResponse = await api.get('https://vypaar2-0.onrender.com/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        console.log("Dashboard Data Success:", dResponse.data)
        setData(dResponse.data)

        // 3. FETCH HEALTH SCORE (Hardcoded URL)
        try {
          const hResponse = await api.get('https://vypaar2-0.onrender.com/dashboard/health-score', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
          setHealth(hResponse.data)
        } catch (hError) {
          console.warn("Health score skip:", hError)
        }

      } catch (e) {
        console.error("Dashboard Load Error:", e)
        if (e.response?.status === 401) {
          toast.error("Session expired")
          navigate('/login')
        } else {
          toast.error("Backend Connection Failed ❌")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [navigate])

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="p-6 text-white bg-[#0a0a0a] min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-400 mt-1">Real-time business analytics</p>
        </div>
        <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-500 text-sm font-medium flex items-center gap-2">
          <Sparkles size={14} />
          AI Powered
        </div>
      </div>

      {data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            label="Total Revenue" 
            value={`₹${data.total_revenue || 0}`} 
            icon={TrendingUp} 
            color="#f97316" 
          />
          <StatCard 
            label="Total Orders" 
            value={data.total_orders || 0} 
            icon={ShoppingCart} 
            color="#8b5cf6" 
          />
          <StatCard 
            label="Customers" 
            value={data.total_customers || 0} 
            icon={Users} 
            color="#0ea5e9" 
          />
          <StatCard 
            label="Inventory" 
            value={data.total_products || 0} 
            icon={Package} 
            color="#10b981" 
          />
        </div>
      ) : (
        <div className="p-10 text-center border border-dashed border-gray-800 rounded-xl">
          <AlertTriangle className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-500">No data available from server.</p>
        </div>
      )}

      {/* Raw Data for Jury Proof (Optional: remove after demo) */}
      <details className="mt-10 opacity-30">
        <summary className="text-xs cursor-pointer">View Server Response</summary>
        <pre className="text-[10px] mt-2 bg-black p-4 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  )
}