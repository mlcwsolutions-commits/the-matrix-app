// client/src/pages/WaitlistDashboard.jsx
// THE MATRIX V4.1 - Waitlist Dashboard

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const WHATSAPP_LINK = "https://chat.whatsapp.com/IMRG4tKz9K6G2DntpdnVvu?mode=gi_t"

function WaitlistDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [waitlistInfo, setWaitlistInfo] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadWaitlistData()
  }, [])

  const loadWaitlistData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        navigate('/login')
        return
      }

      const { data: authUser } = await supabase.auth.getUser()
      
      const { data: waitlistData, error: waitlistError } = await supabase
        .from('early_access')
        .select('*')
        .eq('email', authUser.user.email)
        .maybeSingle()

      if (waitlistError) throw waitlistError

      setUser(authUser.user)
      setWaitlistInfo(waitlistData)
    } catch (err) {
      console.error('Error loading waitlist:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const copyReferralLink = () => {
    const link = `${window.location.origin}/?ref=${waitlistInfo?.referral_code || ''}`
    navigator.clipboard.writeText(link)
    alert('Referral link copied!')
  }

  const copyReferralCode = () => {
    navigator.clipboard.writeText(waitlistInfo?.referral_code || '')
    alert('Referral code copied!')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #00ff88', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'white', marginTop: '15px' }}>Loading...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#1a1a3a', padding: '30px', borderRadius: '10px', textAlign: 'center', border: '1px solid #ff4444' }}>
          <h2 style={{ color: '#ff4444' }}>Error</h2>
          <p style={{ color: '#aaa' }}>{error}</p>
          <button onClick={() => navigate('/')} style={{ padding: '10px 20px', background: '#00ff88', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Go Home</button>
        </div>
      </div>
    )
  }

  const position = waitlistInfo?.waitlist_position || '?'
  const isLocked = position <= 21
  const referralLink = `${window.location.origin}/?ref=${waitlistInfo?.referral_code || ''}`

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a3a', padding: '15px 30px', borderBottom: '1px solid #00ff88' }}>
        <h1 style={{ color: '#00ff88', margin: 0, cursor: 'pointer' }} onClick={() => navigate('/')}>🔷 THE MATRIX</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: 'white' }}>Welcome, {user?.user_metadata?.name || 'User'}!</span>
          <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#ff4444', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ fontSize: '64px', marginBottom: '10px' }}>🎉</div>
          <h1 style={{ color: '#00ff88', marginBottom: '10px' }}>You're on the waitlist!</h1>
          <p style={{ color: '#aaa' }}>You're one step closer to joining The Matrix.</p>
        </div>

        <div style={{ background: '#0a0a2a', padding: '30px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center', border: '1px solid #00ff88' }}>
          <p style={{ color: '#aaa', marginBottom: '10px' }}>Your Position:</p>
          <p style={{ color: '#00ff88', fontSize: '48px', fontWeight: 'bold', margin: '0' }}>#{position}</p>
          {isLocked && (
            <div style={{ marginTop: '10px' }}>
              <span style={{ color: '#ffa502', fontSize: '12px', background: '#ffa50220', padding: '4px 12px', borderRadius: '20px' }}>
                🔒 Locked position (1-21 cannot be changed)
              </span>
            </div>
          )}
        </div>

        {waitlistInfo?.referral_code && (
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #ffa502' }}>
            <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '15px', fontSize: '14px' }}>
              Share your referral link to move up the list:
            </p>
            <code style={{ display: 'block', background: '#0a0a2a', padding: '12px', borderRadius: '5px', color: '#00ff88', textAlign: 'center', marginBottom: '15px', wordBreak: 'break-all', fontSize: '12px' }}>
              {referralLink}
            </code>
            <button 
              onClick={copyReferralLink} 
              style={{ width: '100%', padding: '12px', background: '#00ccff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', color: '#0a0a2a', marginBottom: '10px' }}
            >
              📋 Copy Referral Link
            </button>
            <code style={{ display: 'block', background: '#0a0a2a', padding: '8px', borderRadius: '5px', color: '#ffa502', textAlign: 'center', fontSize: '11px', wordBreak: 'break-all' }}>
              Your Code: {waitlistInfo.referral_code}
            </code>
          </div>
        )}

        <div style={{ 
          background: 'linear-gradient(135deg, #ffa50220, #ffa50205)', 
          padding: '20px', 
          borderRadius: '10px', 
          marginBottom: '20px', 
          border: '2px solid #ffa502',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🚀</div>
          <h3 style={{ color: '#ffa502', marginBottom: '10px' }}>LOCK IN NOW!</h3>
          <p style={{ color: '#aaa', marginBottom: '15px', fontSize: '14px' }}>
            Get priority access and exclusive updates. Ask us how!
          </p>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              background: '#25D366',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '50px',
              textDecoration: 'none',
              fontWeight: 'bold',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontSize: '20px' }}>📱</span>
            Join our WhatsApp Group
          </a>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', padding: '20px', borderTop: '1px solid #333' }}>
          <p style={{ color: '#aaa', fontSize: '14px' }}>
            ⏰ Launch Date: <strong style={{ color: '#00ff88' }}>June 1, 2026</strong>
          </p>
          <p style={{ color: '#666', fontSize: '12px' }}>
            You will be notified when your spot is ready.
          </p>
        </div>
      </div>
    </div>
  )
}

export default WaitlistDashboard