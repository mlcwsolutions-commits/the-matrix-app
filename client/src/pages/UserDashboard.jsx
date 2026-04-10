import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function UserDashboard({ session }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [userData, setUserData] = useState(null)
  const [downline, setDownline] = useState({
    level1: [],
    level2: [],
    level3: [],
    level4: []
  })
  const [stats, setStats] = useState({
    master_points: 0,
    commission_earned: 0,
    global_level: 'Root',
    matrix_number: 1,
    spots_filled: 0,
    total_spots: 341,
    recovery_fund: 0,
    downline_count: 0
  })
  const [transactions, setTransactions] = useState([])

  const EDGE_FUNCTION_URL = 'https://iqctlwnlesnimzzatwry.supabase.co/functions/v1/get-user-data'
  const BUY_SPONSORED_URL = 'https://iqctlwnlesnimzzatwry.supabase.co/functions/v1/buy-self-sponsored'
  const DOWNLINE_URL = 'https://iqctlwnlesnimzzatwry.supabase.co/functions/v1/get-downline'

  useEffect(() => {
    loadUserData()
    loadDownline()
  }, [])

  const loadUserData = async () => {
    try {
      setLoading(true)
      
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !currentSession) {
        console.error('Session error:', sessionError)
        navigate('/login')
        return
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentSession.user.id })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        const user = result.user
        const matrix = result.currentMatrix
        const recovery = result.recoveryFund
        const txs = result.transactions || []

        setUserData(user)
        setStats({
          master_points: user.master_points || 0,
          commission_earned: user.commission_earned || 0,
          global_level: 'Root',
          matrix_number: matrix?.matrix_number || 1,
          spots_filled: result.totalSpotsFilled || 0,
          total_spots: result.totalSpots || 341,
          recovery_fund: recovery || 0,
          downline_count: result.downlineCount || 0
        })
        setTransactions(txs)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDownline = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) return

      const response = await fetch(DOWNLINE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentSession.user.id })
      })

      const result = await response.json()
      if (result.success) {
        setDownline(result.downline)
      }
    } catch (error) {
      console.error('Error loading downline:', error)
    }
  }

  const buySelfSponsored = async () => {
    if (buying) return
    
    try {
      setBuying(true)
      
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      if (!currentSession) {
        alert('Please login again')
        return
      }

      if ((userData?.master_points || 0) < 50000) {
        alert('Insufficient points. You need 50,000 points.')
        return
      }

      const response = await fetch(BUY_SPONSORED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentSession.user.id })
      })

      const result = await response.json()

      if (result.success) {
        alert('✅ ' + result.message)
        loadUserData()
        loadDownline()
      } else {
        alert('❌ ' + result.message)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error buying self-sponsored account')
    } finally {
      setBuying(false)
    }
  }

  const handleLogout = async () => {
  await supabase.auth.signOut()
  sessionStorage.removeItem('isAdmin')
  navigate('/login', { replace: true })
}

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #00ff88', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'white', marginTop: '15px' }}>Loading your dashboard...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  // Helper to render level 1 spots
  const renderLevel1Spots = () => {
    const spots = []
    for (let pos = 1; pos <= 4; pos++) {
      const occupant = downline.level1.find(s => s.position === pos)
      spots.push(
        <div key={pos} style={{
          width: '80px',
          height: '80px',
          background: occupant ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          border: occupant ? '2px solid #00ff88' : '2px solid rgba(0, 255, 255, 0.2)',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div style={{ position: 'absolute', top: '5px', left: '5px', fontSize: '10px', color: '#888' }}>{pos}</div>
          {occupant ? (
            <div style={{ color: '#00ff88', fontSize: '12px', fontWeight: 'bold' }}>{occupant.userName?.substring(0, 6)}</div>
          ) : (
            <div style={{ color: '#ff6666', fontSize: '11px' }}>Empty</div>
          )}
        </div>
      )
    }
    return spots
  }

  // Helper to render level 2 spots (condensed)
  const renderLevel2Summary = () => {
    const occupiedCount = downline.level2.length
    return (
      <div style={{ marginTop: '10px' }}>
        <div style={{ background: '#0a0a2a', height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ width: `${(occupiedCount / 16) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #00ccff, #00ff88)', borderRadius: '10px' }}></div>
        </div>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#aaa', marginTop: '8px' }}>{occupiedCount} / 16 spots filled</p>
      </div>
    )
  }

  // Helper to render level 3 summary
  const renderLevel3Summary = () => {
    const occupiedCount = downline.level3.length
    return (
      <div style={{ marginTop: '10px' }}>
        <div style={{ background: '#0a0a2a', height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ width: `${(occupiedCount / 64) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #00ccff, #00ff88)', borderRadius: '10px' }}></div>
        </div>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#aaa', marginTop: '8px' }}>{occupiedCount} / 64 spots filled</p>
      </div>
    )
  }

  // Helper to render level 4 summary
  const renderLevel4Summary = () => {
    const occupiedCount = downline.level4.length
    return (
      <div style={{ marginTop: '10px' }}>
        <div style={{ background: '#0a0a2a', height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ width: `${(occupiedCount / 256) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #00ccff, #00ff88)', borderRadius: '10px' }}></div>
        </div>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#aaa', marginTop: '8px' }}>{occupiedCount} / 256 spots filled</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a3a', padding: '15px 30px', borderBottom: '1px solid #00ff88' }}>
        <h1 style={{ color: '#00ff88', margin: 0 }}>🔷 THE MATRIX</h1>
        <div>
          <span style={{ color: 'white', marginRight: '15px' }}>Welcome, {session?.user?.user_metadata?.name || userData?.name || 'User'}!</span>
          <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#ff4444', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px' }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #00ff88' }}>
            <h3 style={{ color: '#aaa', marginBottom: '10px' }}>Your Points</h3>
            <h2 style={{ color: '#00ff88', fontSize: '32px', margin: 0 }}>{stats.master_points.toLocaleString()}</h2>
          </div>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #00ff88' }}>
            <h3 style={{ color: '#aaa', marginBottom: '10px' }}>Commission Earned</h3>
            <h2 style={{ color: '#00ff88', fontSize: '32px', margin: 0 }}>{stats.commission_earned.toLocaleString()}</h2>
          </div>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #00ff88' }}>
            <h3 style={{ color: '#aaa', marginBottom: '10px' }}>Your Level</h3>
            <h2 style={{ color: '#00ff88', fontSize: '32px', margin: 0 }}>{stats.global_level}</h2>
          </div>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #00ff88' }}>
            <h3 style={{ color: '#aaa', marginBottom: '10px' }}>Matrix #</h3>
            <h2 style={{ color: '#00ff88', fontSize: '32px', margin: 0 }}>{stats.matrix_number}</h2>
          </div>
        </div>

        {/* Matrix Visualization */}
        <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
          <h2 style={{ color: '#00ccff', marginBottom: '20px', textAlign: 'center' }}>🔷 YOUR MATRIX DOWNLINE</h2>
          
          {/* Level 0 - You */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ display: 'inline-block', background: '#0a0a2a', padding: '15px 30px', borderRadius: '10px', border: '2px solid #ffd700' }}>
              <div style={{ fontSize: '12px', color: '#888' }}>Level 0</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffd700' }}>👤 YOU</div>
            </div>
          </div>

          {/* Level 1 - Direct referrals (4 spots) */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <span style={{ color: '#ffa502', fontWeight: 'bold' }}>LEVEL 1</span>
              <span style={{ color: '#888', fontSize: '12px', marginLeft: '10px' }}>(4 spots - Your Direct Downline)</span>
              <span style={{ color: '#00ff88', fontSize: '12px', marginLeft: '10px' }}>💰 25% commission</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
              {renderLevel1Spots()}
            </div>
          </div>

          {/* Level 2 */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <span style={{ color: '#ffa502', fontWeight: 'bold' }}>LEVEL 2</span>
              <span style={{ color: '#888', fontSize: '12px', marginLeft: '10px' }}>(16 spots)</span>
              <span style={{ color: '#00ff88', fontSize: '12px', marginLeft: '10px' }}>💰 25% commission</span>
            </div>
            {renderLevel2Summary()}
          </div>

          {/* Level 3 */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <span style={{ color: '#ffa502', fontWeight: 'bold' }}>LEVEL 3</span>
              <span style={{ color: '#888', fontSize: '12px', marginLeft: '10px' }}>(64 spots)</span>
              <span style={{ color: '#00ff88', fontSize: '12px', marginLeft: '10px' }}>💰 25% commission</span>
            </div>
            {renderLevel3Summary()}
          </div>

          {/* Level 4 */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <span style={{ color: '#ffa502', fontWeight: 'bold' }}>LEVEL 4</span>
              <span style={{ color: '#888', fontSize: '12px', marginLeft: '10px' }}>(256 spots - Placement only)</span>
              <span style={{ color: '#ff6666', fontSize: '12px', marginLeft: '10px' }}>📌 No commissions</span>
            </div>
            {renderLevel4Summary()}
          </div>
        </div>

        {/* Two Column Layout for Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Left Column - Actions */}
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px' }}>
            <h2 style={{ color: '#00ccff', marginBottom: '20px' }}>⚡ Your Actions</h2>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#aaa', marginBottom: '8px' }}>Your Referral Code:</p>
              <code style={{ display: 'block', background: '#0a0a2a', padding: '10px', borderRadius: '5px', textAlign: 'center', color: '#00ff88', marginBottom: '10px' }}>
                {userData?.referral_code || 'Loading...'}
              </code>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(userData?.referral_code || '')
                  alert('Referral code copied!')
                }}
                style={{ width: '100%', padding: '10px', background: '#333', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer' }}
              >
                📋 Copy Code
              </button>
            </div>
            <button 
              onClick={buySelfSponsored}
              disabled={buying}
              style={{ 
                width: '100%', 
                padding: '12px', 
                background: buying ? '#555' : 'linear-gradient(135deg, #00ccff, #00ff88)', 
                border: 'none', 
                borderRadius: '5px', 
                fontWeight: 'bold', 
                cursor: buying ? 'not-allowed' : 'pointer', 
                marginBottom: '10px',
                color: '#0a0a2a'
              }}
            >
              {buying ? 'Processing...' : '🔄 Buy Self-Sponsored Account (50,000 pts)'}
            </button>
            <button 
              onClick={() => {
                loadUserData()
                loadDownline()
              }}
              style={{ width: '100%', padding: '12px', background: '#333', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer' }}
            >
              🔄 Refresh Dashboard
            </button>
          </div>

          {/* Right Column - Stats Summary */}
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px' }}>
            <h2 style={{ color: '#00ccff', marginBottom: '20px' }}>📊 Matrix Stats</h2>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <p style={{ color: '#aaa' }}>Total Spots Filled</p>
                <p style={{ color: '#00ff88', fontSize: '28px', fontWeight: 'bold' }}>{stats.spots_filled} / {stats.total_spots}</p>
                <div style={{ background: '#0a0a2a', height: '10px', borderRadius: '5px', overflow: 'hidden', marginTop: '10px' }}>
                  <div style={{ width: `${(stats.spots_filled / stats.total_spots) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #00ccff, #00ff88)' }}></div>
                </div>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <p style={{ color: '#aaa' }}>Recovery Fund</p>
                <p style={{ color: '#ffa502', fontSize: '24px', fontWeight: 'bold' }}>{stats.recovery_fund.toLocaleString()} pts</p>
              </div>
              <div>
                <p style={{ color: '#aaa' }}>People You've Referred</p>
                <p style={{ color: '#00ff88', fontSize: '24px', fontWeight: 'bold' }}>{downline.level1.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Section */}
        <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', marginTop: '30px' }}>
          <h2 style={{ color: '#00ccff', marginBottom: '20px' }}>📜 Recent Transactions</h2>
          {transactions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>No transactions yet</p>
          ) : (
            <div>
              {transactions.slice(0, 10).map((tx, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #333' }}>
                  <div style={{ color: '#aaa' }}>{new Date(tx.timestamp).toLocaleDateString()}</div>
                  <div style={{ color: '#aaa' }}>{tx.type.replace(/_/g, ' ').toUpperCase()}</div>
                  <div style={{ color: tx.amount > 0 ? '#00ff88' : '#ff6666' }}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '30px', padding: '20px', color: '#555' }}>
          <p>Together We Will All Prosper</p>
        </div>
      </div>
    </div>
  )
}

export default UserDashboard