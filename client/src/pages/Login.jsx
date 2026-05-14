// client/src/pages/Login.jsx
// THE MATRIX V5.0 - Professional Clean Design

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
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const styles = {
    container: {
      minHeight: '100vh',
      background: '#0d0d12',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    },
    card: {
      background: '#16161f',
      padding: '32px',
      borderRadius: '20px',
      width: '100%',
      maxWidth: '450px',
      border: loginType === 'admin' ? '1px solid #ffa502' : '1px solid #00ff88',
    },
    header: {
      textAlign: 'center',
      marginBottom: '24px',
    },
    logo: {
      color: loginType === 'admin' ? '#ffa502' : '#00ff88',
      fontSize: '28px',
      marginBottom: '8px',
      letterSpacing: '-0.02em',
    },
    tabContainer: {
      display: 'flex',
      marginBottom: '24px',
      gap: '12px',
    },
    userTab: {
      flex: 1,
      padding: '10px',
      background: loginType === 'user' ? '#00ff88' : 'transparent',
      border: loginType === 'user' ? 'none' : '1px solid #00ff88',
      cursor: 'pointer',
      borderRadius: '100px',
      color: loginType === 'user' ? '#0d0d12' : '#00ff88',
      fontWeight: 'bold',
      transition: 'all 0.2s ease',
    },
    adminTab: {
      flex: 1,
      padding: '10px',
      background: loginType === 'admin' ? '#ffa502' : 'transparent',
      border: loginType === 'admin' ? 'none' : '1px solid #ffa502',
      cursor: 'pointer',
      borderRadius: '100px',
      color: loginType === 'admin' ? '#0d0d12' : '#ffa502',
      fontWeight: 'bold',
      transition: 'all 0.2s ease',
    },
    label: {
      color: '#aaa',
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
    },
    inputBase: {
      width: '100%',
      padding: '12px',
      borderRadius: '12px',
      background: '#0d0d12',
      color: 'white',
      fontSize: '16px',
      outline: 'none',
      transition: 'all 0.2s ease',
    },
    successBox: {
      background: '#00ff88',
      color: '#0d0d12',
      padding: '12px',
      borderRadius: '12px',
      marginBottom: '16px',
      textAlign: 'center',
      fontWeight: 'bold',
    },
    errorBox: {
      background: '#ff4444',
      color: 'white',
      padding: '12px',
      borderRadius: '12px',
      marginBottom: '16px',
      fontSize: '14px',
      textAlign: 'center',
    },
    button: {
      width: '100%',
      padding: '14px',
      background: loading ? '#555' : (loginType === 'admin' ? '#ffa502' : 'linear-gradient(135deg, #00ccff, #00ff88)'),
      border: 'none',
      borderRadius: '100px',
      fontWeight: 'bold',
      cursor: loading ? 'not-allowed' : 'pointer',
      color: '#0d0d12',
      fontSize: '16px',
      transition: 'all 0.2s ease',
    },
    footer: {
      marginTop: '32px',
      textAlign: 'center',
      paddingTop: '20px',
      borderTop: '1px solid #252530',
      color: '#555',
      fontSize: '12px',
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.95)',
      zIndex: 3000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    },
    modalContent: {
      background: '#16161f',
      padding: '32px',
      borderRadius: '20px',
      maxWidth: '700px',
      width: '100%',
      maxHeight: '85vh',
      overflowY: 'auto',
      border: '1px solid #00ff88',
      position: 'relative',
    },
  }

  const getInputStyle = () => {
    const baseStyle = { ...styles.inputBase }
    if (loginType === 'admin') {
      baseStyle.border = '1px solid #ffa502'
    } else {
      baseStyle.border = '1px solid #252530'
    }
    return baseStyle
  }

  useEffect(() => {
    sessionStorage.removeItem('isAdmin')
    supabase.auth.signOut()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const message = params.get('message')
    if (message) {
      setSuccess(message.replace(/\+/g, ' '))
      window.history.replaceState({}, document.title, '/login')
    }
  }, [location])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (loginType === 'admin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        sessionStorage.setItem('isAdmin', 'true')
        window.location.href = '/admin'
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        
        const { data: waitlistData } = await supabase
  .from('early_access')
  .select('waitlist_position, converted_at')
  .eq('email', data.user.email)
  .maybeSingle()

const { data: userData } = await supabase
  .from('users')
  .select('account_status')
  .eq('id', data.user.id)
  .maybeSingle()

if (waitlistData?.waitlist_position && !waitlistData?.converted_at) {
  window.location.href = '/waitlist'  // ← CHANGED FROM /waitlistdashboard
} else if (userData?.account_status === 'active') {
  window.location.href = '/dashboard'
} else {
  window.location.href = '/dashboard'
}
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleInputFocus = (e) => {
    e.target.style.borderColor = loginType === 'admin' ? '#ffa502' : '#00ff88'
    e.target.style.boxShadow = loginType === 'admin' ? '0 0 0 2px rgba(255,165,2,0.2)' : '0 0 0 2px rgba(0,255,136,0.2)'
  }

  const handleInputBlur = (e) => {
    e.target.style.borderColor = loginType === 'admin' ? '#ffa502' : '#252530'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.logo}>🔷 THE MATRIX</h1>
        </div>
        
        <div style={styles.tabContainer}>
          <button 
            onClick={() => setLoginType('user')} 
            style={styles.userTab}
            onMouseEnter={(e) => {
              if (loginType !== 'user') {
                e.currentTarget.style.background = 'rgba(0,255,136,0.1)'
              }
            }}
            onMouseLeave={(e) => {
              if (loginType !== 'user') {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            👤 User Login
          </button>
          <button 
            onClick={() => setLoginType('admin')} 
            style={styles.adminTab}
            onMouseEnter={(e) => {
              if (loginType !== 'admin') {
                e.currentTarget.style.background = 'rgba(255,165,2,0.1)'
              }
            }}
            onMouseLeave={(e) => {
              if (loginType !== 'admin') {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            👑 Admin
          </button>
        </div>

        {success && (
          <div style={styles.successBox}>
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={styles.label}>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={getInputStyle()}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={loginType === 'admin' ? 'admin@thematrix.com' : 'your@email.com'} 
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={styles.label}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={getInputStyle()}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="••••••••" 
            />
          </div>

          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            style={styles.button}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.opacity = '0.85'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.transform = 'translateY(0)'
              }
            }}
          >
            {loading ? 'Logging in...' : (loginType === 'admin' ? 'Admin Login' : 'Login')}
          </button>
        </form>

        {loginType === 'user' && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link to="/signup" style={{ color: '#00ccff', textDecoration: 'none', fontSize: '14px' }}>
              Don't have an account? <span style={{ fontWeight: 'bold' }}>Create Account</span>
            </Link>
          </div>
        )}

        {loginType === 'admin' && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link to="/" style={{ color: '#ffa502', textDecoration: 'none', fontSize: '14px' }}>
              ← Back to Site
            </Link>
          </div>
        )}

        {/* Standard Footer - Matching LandingPage */}
        <div style={styles.footer}>
          <p style={{ marginBottom: '8px', color: '#888', fontSize: '12px' }}>Together We Will All Prosper</p>
          <p style={{ fontSize: '12px' }}>
            <span 
              onClick={() => setShowTermsModal(true)} 
              style={{ color: '#00ccff', cursor: 'pointer', textDecoration: 'none' }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              Terms of Service
            </span>
            {' • '}
            <span 
              onClick={() => setShowPrivacyModal(true)} 
              style={{ color: '#00ccff', cursor: 'pointer', textDecoration: 'none' }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              Privacy Policy
            </span>
            {' • © 2026 The Matrix (V5.0)'}
          </p>
        </div>
      </div>

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowTermsModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowTermsModal(false)} style={{ position: 'sticky', top: '0', right: '0', float: 'right', background: 'transparent', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer', zIndex: 10 }}>✕</button>
            <div style={{ clear: 'both' }}></div>
            <h1 style={{ color: '#00ff88', fontSize: '28px', marginBottom: '10px' }}>Terms of Service</h1>
            <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '20px' }}>Effective Date: May 1, 2026</p>
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginTop: '20px', marginBottom: '10px' }}>Introduction</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>Welcome to The Matrix ("Platform", "we", "us", "our"). These Terms of Service ("Terms") govern your use of our platform, website, and related services. By accessing or using The Matrix, you agree to be bound by these Terms.</p>
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>Definitions</h2>
            <ul style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px', paddingLeft: '20px' }}>
              <li><strong style={{ color: '#00ff88' }}>Points:</strong> The internal virtual currency of The Matrix, used for purchasing matrix positions</li>
              <li><strong style={{ color: '#00ff88' }}>Matrix Position:</strong> A digital asset representing a spot in the 4-wide matrix structure</li>
              <li><strong style={{ color: '#00ff88' }}>Commission:</strong> Points earned from point purchases within your downline</li>
              <li><strong style={{ color: '#00ff88' }}>Recovery Fund:</strong> A community-owned pool funded by a portion of every point purchase</li>
              <li><strong style={{ color: '#00ff88' }}>User:</strong> Any individual who registers an account on The Matrix</li>
            </ul>
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>No Investment or Security</h2>
            <p style={{ color: '#ff8888', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px', fontWeight: 'bold' }}>IMPORTANT: The Matrix is NOT an investment vehicle, security, or financial instrument.</p>
            <ul style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px', paddingLeft: '20px' }}>
              <li>Points have no guaranteed value</li>
              <li>Commissions are not guaranteed returns</li>
              <li>No promise of profit is made</li>
              <li>You are purchasing a digital asset, not an investment</li>
            </ul>
            <p style={{ color: '#00ff88', fontSize: '14px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #252530' }}>BY USING THE MATRIX, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO THESE TERMS.</p>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPrivacyModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowPrivacyModal(false)} style={{ position: 'sticky', top: '0', right: '0', float: 'right', background: 'transparent', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer', zIndex: 10 }}>✕</button>
            <div style={{ clear: 'both' }}></div>
            <h1 style={{ color: '#00ff88', fontSize: '28px', marginBottom: '10px' }}>Privacy Policy</h1>
            <p style={{ color: '#aaa', fontSize: '12px', marginBottom: '20px' }}>Effective Date: May 1, 2026</p>
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>Information We Collect</h2>
            <ul style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px', paddingLeft: '20px' }}>
              <li><strong style={{ color: '#00ff88' }}>Account Information:</strong> Email, name, alias</li>
              <li><strong style={{ color: '#00ff88' }}>Transaction Data:</strong> Point purchases, commissions, redemptions</li>
              <li><strong style={{ color: '#00ff88' }}>Usage Data:</strong> Login times, feature usage</li>
              <li><strong style={{ color: '#00ff88' }}>Device Information:</strong> IP address, browser type</li>
            </ul>
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>Contact</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>Privacy questions: hello@the-matrix.app</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login