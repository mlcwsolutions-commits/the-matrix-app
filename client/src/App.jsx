// client/src/App.jsx
// THE MATRIX V5.0 - Main App Component

import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import UserDashboard from './pages/UserDashboard'
import WaitlistDashboard from './pages/WaitlistDashboard'
import AdminDashboard from './pages/AdminDashboard'
import ManualCryptoPage from './pages/ManualCryptoPage'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0d0d12', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            display: 'inline-block', 
            width: '40px', 
            height: '40px', 
            border: '4px solid #00ff88', 
            borderTopColor: 'transparent', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite' 
          }}></div>
          <p style={{ color: 'white', marginTop: '15px' }}>Loading...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Waitlist Dashboard - For waitlisted users only */}
      <Route 
        path="/waitlist" 
        element={session ? <WaitlistDashboard /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/waitlistdashboard" 
        element={session ? <WaitlistDashboard /> : <Navigate to="/login" />} 
      />
      
      {/* User Dashboard - For active users only */}
      <Route 
        path="/dashboard" 
        element={session ? <UserDashboard /> : <Navigate to="/login" />} 
      />
      
      {/* Admin Dashboard */}
      <Route 
        path="/admin" 
        element={session ? <AdminDashboard /> : <Navigate to="/login" />} 
      />
      
      {/* Manual Crypto Page */}
      <Route 
        path="/manual-crypto" 
        element={session ? <ManualCryptoPage /> : <Navigate to="/login" />} 
      />
    </Routes>
  )
}

export default App