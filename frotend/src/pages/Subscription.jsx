import { useEffect, useState } from 'react'
import { api } from '../lib/supabase'
import toast from 'react-hot-toast'
import { CreditCard, Check, Zap, Lock, Star } from 'lucide-react'

const FREE_FEATURES = [
  'Create unlimited bills',
  'Inventory management',
  'Customer tracking',
  'Basic dashboard',
  'Sales history',
]

const PREMIUM_FEATURES = [
  'Everything in Free',
  'AI Daily Insights (GPT-4)',
  'Demand Forecasting (7 days)',
  'Customer RFM Segmentation',
  'Anomaly Detection alerts',
  'Business Health Score',
  'Priority support',
]

export default function Subscription() {
  const [sub, setSub]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying]   = useState(false)

  useEffect(() => {
    api.get('/subscription/status')
      .then(r => setSub(r.data))
      .catch(() => toast.error('Failed to load plan'))
      .finally(() => setLoading(false))

    // Load Razorpay script
    if (!window.Razorpay) {
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      document.body.appendChild(s)
    }
  }, [])

  const handleUpgrade = async () => {
    setPaying(true)
    try {
      const res = await api.post('/subscription/create-order')
      const { subscription_id, key_id } = res.data

      const options = {
        key:             key_id,
        subscription_id: subscription_id,
        name:            'Vyapaar AI Copilot',
        description:     'Premium Plan — ₹499/month',
        image:           '',
        theme:           { color: '#f97316' },
        handler: async (response) => {
          try {
            await api.post('/subscription/verify', {
              razorpay_payment_id:      response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature:       response.razorpay_signature,
            })
            toast.success('🎉 Welcome to Premium!')
            const updated = await api.get('/subscription/status')
            setSub(updated.data)
          } catch (e) {
            toast.error('Payment verification failed: ' + e.message)
          }
        },
        modal: { ondismiss: () => setPaying(false) }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (e) {
      toast.error(e.message)
      setPaying(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  )

  const isPremium = sub?.plan === 'premium' && sub?.status === 'active'

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <CreditCard size={20} style={{ color: '#f97316' }} />
        <h1 className="text-xl font-bold">Subscription</h1>
      </div>
      <p className="text-sm mb-8" style={{ color: '#666' }}>
        Manage your Vyapaar AI Copilot plan
      </p>

      {/* Current plan banner */}
      {isPremium && (
        <div className="rounded-xl p-4 flex items-center gap-3 mb-6"
             style={{ background: '#f9731611', border: '1px solid #f9731633' }}>
          <Star size={18} style={{ color: '#f97316' }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: '#f97316' }}>You're on Premium</p>
            <p className="text-xs mt-0.5" style={{ color: '#f97316aa' }}>
              {sub?.expiry
                ? `Renews on ${new Date(sub.expiry).toLocaleDateString('en-IN', { dateStyle: 'long' })}`
                : 'Active subscription'}
            </p>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Free */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-base">Free</p>
            {!isPremium && (
              <span className="badge" style={{ background: '#22c55e22', color: '#22c55e' }}>Current</span>
            )}
          </div>
          <p className="text-3xl font-bold mt-2 mb-1">₹0</p>
          <p className="text-xs mb-5" style={{ color: '#555' }}>Forever free</p>

          <div className="flex flex-col gap-2.5">
            {FREE_FEATURES.map(f => (
              <div key={f} className="flex items-start gap-2">
                <Check size={13} className="mt-0.5 flex-shrink-0" style={{ color: '#22c55e' }} />
                <span className="text-sm" style={{ color: '#ccc' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Premium */}
        <div className="card p-6 relative overflow-hidden"
             style={{ border: '1px solid #f9731644' }}>
          {/* Glow */}
          <div className="absolute inset-0 pointer-events-none"
               style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #f9731608, transparent)' }} />

          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-base">Premium</p>
                <Zap size={13} style={{ color: '#f97316' }} />
              </div>
              {isPremium && (
                <span className="badge" style={{ background: '#f9731622', color: '#f97316' }}>Active</span>
              )}
            </div>
            <p className="text-3xl font-bold mt-2" style={{ color: '#f97316' }}>₹499</p>
            <p className="text-xs mb-5" style={{ color: '#555' }}>per month · cancel anytime</p>

            <div className="flex flex-col gap-2.5 mb-6">
              {PREMIUM_FEATURES.map(f => (
                <div key={f} className="flex items-start gap-2">
                  <Check size={13} className="mt-0.5 flex-shrink-0" style={{ color: '#f97316' }} />
                  <span className="text-sm" style={{ color: '#ccc' }}>{f}</span>
                </div>
              ))}
            </div>

            {isPremium ? (
              <button className="btn-ghost w-full text-sm" disabled>
                ✓ Already on Premium
              </button>
            ) : (
              <button className="btn-brand w-full text-sm flex items-center justify-center gap-2"
                      onClick={handleUpgrade} disabled={paying}>
                {paying
                  ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  : <><Lock size={13} /> Upgrade Now</>
                }
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-8">
        <p className="text-xs uppercase tracking-widest mb-4" style={{ color: '#555' }}>Common Questions</p>
        <div className="flex flex-col gap-3">
          {[
            ['Can I cancel anytime?', 'Yes. Cancel from Razorpay dashboard and your plan downgrades at end of billing cycle.'],
            ['Is my data safe?', 'All data is stored in your private Supabase project with row-level security. We never share your data.'],
            ['What payment methods are accepted?', 'UPI, credit/debit cards, net banking via Razorpay.'],
            ['Do I lose data if I downgrade?', 'No. Your historical data stays. Only AI features are paused.'],
          ].map(([q, a]) => (
            <div key={q} className="card p-4">
              <p className="text-sm font-medium mb-1">{q}</p>
              <p className="text-xs" style={{ color: '#666' }}>{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
