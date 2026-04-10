import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loginType, setLoginType] = useState('user')
  const navigate = useNavigate()
  const location = useLocation()

  // Clear any stale sessions on login page load
  useEffect(() => {
    sessionStorage.removeItem('isAdmin')
    supabase.auth.signOut()
  }, [])

  // Read success message from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const message = params.get('message')
    if (message) {
      const decodedMessage = message.replace(/\+/g, ' ')
      setSuccess(decodedMessage)
      window.history.replaceState({}, document.title, '/login')
    }
  }, [location])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (loginType === 'admin') {
        // Admin login
        if (email === 'admin@thematrix.com' && password === 'admin123') {
          // Clear any existing user session
          await supabase.auth.signOut()
          // Set admin flag
          sessionStorage.setItem('isAdmin', 'true')
          // Use window.location for hard redirect
          window.location.href = '/admin'
        } else {
          setError('Invalid admin credentials')
          setLoading(false)
        }
      } else {
        // User login
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/'
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'rgba(0,0,0,0.5)', padding: '30px', borderRadius: '10px', width: '400px' }}>
        <h1 style={{ color: '#00ff88', textAlign: 'center', marginBottom: '20px' }}>🔷 THE MATRIX</h1>
        
        <div style={{ display: 'flex', marginBottom: '20px' }}>
          <button
            onClick={() => setLoginType('user')}
            style={{ 
              flex: 1, 
              padding: '10px', 
              background: loginType === 'user' ? '#00ff88' : '#333', 
              border: 'none', 
              cursor: 'pointer', 
              borderRadius: '5px 0 0 5px',
              color: loginType === 'user' ? '#0a0a2a' : 'white'
            }}
          >
            👤 User
          </button>
          <button
            onClick={() => setLoginType('admin')}
            style={{ 
              flex: 1, 
              padding: '10px', 
              background: loginType === 'admin' ? '#ffa502' : '#333', 
              border: 'none', 
              cursor: 'pointer', 
              borderRadius: '0 5px 5px 0',
              color: loginType === 'admin' ? '#0a0a2a' : 'white'
            }}
          >
            👑 Admin
          </button>
        </div>

        {success && (
          <div style={{ background: '#00ff88', color: '#000', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign: 'center' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: 'none' }}
              placeholder={loginType === 'admin' ? 'admin@thematrix.com' : 'your@email.com'}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: 'none' }}
              placeholder={loginType === 'admin' ? 'admin123' : '••••••••'}
            />
          </div>

          {error && (
            <div style={{ background: '#ff4444', color: 'white', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: loginType === 'admin' ? '#ffa502' : 'linear-gradient(135deg, #00ccff, #00ff88)', 
              border: 'none', 
              borderRadius: '5px', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              opacity: loading ? 0.7 : 1,
              color: '#0a0a2a'
            }}
          >
            {loading ? 'Loading...' : (loginType === 'admin' ? 'Admin Login' : 'Login')}
          </button>
        </form>

        {loginType === 'user' && (
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <Link to="/signup" style={{ color: '#00ccff' }}>Don't have an account? Create Account</Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default Login