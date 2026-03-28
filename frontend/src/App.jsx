import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Sparkles } from 'lucide-react'

// Components & Pages
import Navbar from './components/Navbar'
import ChatAgent from './components/ChatAgent' // 🤖 The AI Agent
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Billing from './pages/Billing'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import Insights from './pages/Insights'
import Alerts from './pages/Alerts'
import Subscription from './pages/Subscription'

// 1. THE LAYOUT COMPONENT
// This ensures the Navbar and AI Agent are visible on all pages except Login
function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <main className="flex-1 pb-20"> {/* pb-20 gives space for the floating agent */}
        <Outlet />
      </main>
      
      {/* 🏁 THE REAL AGENT - Visible on all protected pages */}
      <ChatAgent /> 
    </div>
  )
}

// 2. PROTECTED ROUTE GUARD
function Protected({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#0f0f0f' }}>
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  )
  
  return user ? children : <Navigate to="/auth" replace />
}

// 3. MAIN APP ROUTING
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Route */}
        <Route path="/auth" element={<Auth />} />

        {/* Protected Dashboard Routes */}
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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}