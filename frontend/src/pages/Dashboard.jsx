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
        // ✅ FIX 1: Correct session fetching
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token

        console.log("TOKEN:", token) // 🔥 DEBUG

        // ❌ if no token
        if (!token) {
          toast.error("Please login first")
          navigate('/login')
          return
        }

        // ✅ FIX 2: API URL debug
        console.log("API URL:", import.meta.env.VITE_API_URL)

        // ✅ FETCH DASHBOARD
        const dResponse = await api.get('/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        console.log("Dashboard Data:", dResponse.data)
        setData(dResponse.data)

        // ✅ FETCH HEALTH SCORE
        try {
          const hResponse = await api.get('/dashboard/health-score', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
          setHealth(hResponse.data)
        } catch (hError) {
          if (hError.response?.status === 429) {
            console.warn("Health score limit reached")
          } else {
            console.error("Health error:", hError)
          }
        }

      } catch (e) {
        console.error("Dashboard Load Error:", e)

        if (e.response?.status === 401) {
          toast.error("Session expired. Login again.")
          navigate('/login')
        } else if (e.response?.status === 429) {
          toast.error("Server busy. Try later.")
        } else {
          toast.error("Backend connection failed ❌")
        }

      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [navigate])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="p-6 text-white">
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>

      {/* SIMPLE DEBUG VIEW */}
      <pre style={{ fontSize: "10px" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}