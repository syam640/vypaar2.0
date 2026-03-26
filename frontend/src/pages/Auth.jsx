import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Zap } from 'lucide-react'

export default function Auth() {
  const [mode, setMode]       = useState('login') // login | signup
  const [loading, setLoading] = useState(false)
  const [form, setForm]       = useState({ email: '', password: '', name: '', business: '' })
  const { signIn, signUp }    = useAuth()
  const navigate              = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(form.email, form.password)
        if (error) throw error
        navigate('/dashboard')
      } else {
        const { error } = await signUp(form.email, form.password, {
          full_name: form.name, business_name: form.business
        })
        if (error) throw error
        toast.success('Account created! Check your email to confirm.')
        setMode('login')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: '#0f0f0f' }}>
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, #f9731612 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: '#f97316' }}>
            <Zap size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-bold text-base leading-tight">Vyapaar AI</p>
            <p className="text-xs" style={{ color: '#666' }}>Business Copilot</p>
          </div>
        </div>

        <div className="card p-6">
          {/* Tabs */}
          <div className="flex mb-6 p-1 rounded-lg gap-1" style={{ background: '#111' }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 py-2 rounded-md text-sm font-medium transition-all"
                style={{
                  background: mode === m ? '#1e1e1e' : 'transparent',
                  color: mode === m ? '#f5f5f5' : '#666',
                  border: mode === m ? '1px solid #2a2a2a' : '1px solid transparent'
                }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#888' }}>Full Name</label>
                  <input className="input" placeholder="Ramesh Kumar" value={form.name}
                         onChange={e => set('name', e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#888' }}>Business Name</label>
                  <input className="input" placeholder="Ramesh General Store" value={form.business}
                         onChange={e => set('business', e.target.value)} />
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#888' }}>Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email}
                     onChange={e => set('email', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#888' }}>Password</label>
              <input className="input" type="password" placeholder="••••••••" value={form.password}
                     onChange={e => set('password', e.target.value)} required minLength={6} />
            </div>

            <button type="submit" className="btn-brand mt-2 w-full text-sm" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: '#444' }}>
          Vyapaar AI Copilot — Built for Indian small businesses
        </p>
      </div>
    </div>
  )
}
