import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Auth     from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Billing   from './pages/Billing'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import Insights  from './pages/Insights'
import Alerts    from './pages/Alerts'
import Subscription from './pages/Subscription'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#0f0f0f' }}>
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  )
  return user ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"    element={<Dashboard />} />
          <Route path="billing"      element={<Billing />} />
          <Route path="inventory"    element={<Inventory />} />
          <Route path="customers"    element={<Customers />} />
          <Route path="insights"     element={<Insights />} />
          <Route path="alerts"       element={<Alerts />} />
          <Route path="subscription" element={<Subscription />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
