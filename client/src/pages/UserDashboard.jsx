import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function UserDashboard({ session }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [userData, setUserData] = useState(null)
  const [userMatrices, setUserMatrices] = useState([])
  const [expandedMatrices, setExpandedMatrices] = useState(new Set())
  const [transactions, setTransactions] = useState([])
  const [stats, setStats] = useState({
    master_points: 0,
    commission_earned: 0,
    spots_filled: 0,
    total_spots: 341,
    recovery_fund: 0
  })

  // Transfer state
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedRecipient, setSelectedRecipient] = useState(null)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDescription, setTransferDescription] = useState('')
  const [transferPassword, setTransferPassword] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  // Buy Points state
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [buyAmount, setBuyAmount] = useState('')
  const [buyLoading, setBuyLoading] = useState(false)

  // Cash Out state
  const [showCashoutModal, setShowCashoutModal] = useState(false)
  const [cashoutAmount, setCashoutAmount] = useState('')
  const [cashoutLoading, setCashoutLoading] = useState(false)

  const EDGE_FUNCTION_URL = 'https://iqctlwnlesnimzzatwry.supabase.co/functions/v1/get-user-data'
  const BUY_SPONSORED_URL = 'https://iqctlwnlesnimzzatwry.supabase.co/functions/v1/buy-self-sponsored'
  const SEARCH_USERS_URL = 'https://iqctlwnlesnimzzatwry.supabase.co/functions/v1/search-users'
  const TRANSFER_URL = 'https://iqctlwnlesnimzzatwry.supabase.co/functions/v1/transfer-points'

  useEffect(() => {
    loadUserData()
    loadUserMatrices()
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
        const recovery = result.recoveryFund
        const txs = result.transactions || []

        setUserData(user)
        setStats({
          master_points: user.master_points || 0,
          commission_earned: user.commission_earned || 0,
          spots_filled: result.totalSpotsFilled || 0,
          total_spots: result.totalSpots || 341,
          recovery_fund: recovery || 0
        })
        setTransactions(txs)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserMatrices = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) return

      console.log('Current user ID:', currentSession.user.id)

      // Get all spots owned by this user
      const { data: userSpots, error: spotsError } = await supabase
        .from('matrix_spots')
        .select('*')
        .eq('user_id', currentSession.user.id)

      console.log('User spots found:', userSpots?.length)
      console.log('User spots:', userSpots)
      
      if (spotsError) {
        console.error('Error fetching spots:', spotsError)
      }

      if (!userSpots || userSpots.length === 0) {
        console.log('No spots found for user')
        setUserMatrices([])
        return
      }

      // For each spot, get its downline
      const matrices = []
      
      for (const spot of userSpots) {
        console.log('Processing spot:', spot.id, 'level:', spot.level, 'position:', spot.position)
        
        // Get all spots in the same matrix
        const { data: allSpots } = await supabase
          .from('matrix_spots')
          .select('*')
          .eq('matrix_id', spot.matrix_id)

        console.log('All spots in matrix:', allSpots?.length)

        // Build downline for this spot
        const downline = []
        
        function findChildren(parentId, currentLevel) {
          if (currentLevel > 4) return
          const children = allSpots?.filter(s => s.parent_id === parentId) || []
          for (const child of children) {
            downline.push({
              ...child,
              relativeLevel: currentLevel,
              isSelf: child.user_id === currentSession.user.id
            })
            findChildren(child.id, currentLevel + 1)
          }
        }
        
        findChildren(spot.id, 1)
        
        const level1 = downline.filter(d => d.relativeLevel === 1)
        const level2 = downline.filter(d => d.relativeLevel === 2)
        const level3 = downline.filter(d => d.relativeLevel === 3)
        const level4 = downline.filter(d => d.relativeLevel === 4)
        
        matrices.push({
          spotId: spot.id,
          level: spot.level,
          position: spot.position,
          matrixId: spot.matrix_id,
          isOriginal: spot.level === 0 && spot.position === 1,
          downline: downline,
          level1: level1,
          level2: level2,
          level3: level3,
          level4: level4,
          filledCount: 1 + level1.length + level2.length + level3.length + level4.length
        })
      }
      
      console.log('Matrices built:', matrices.length)
      setUserMatrices(matrices)
      
      // Auto-expand the original matrix
      const originalMatrix = matrices.find(m => m.isOriginal)
      if (originalMatrix && !expandedMatrices.has(originalMatrix.spotId)) {
        setExpandedMatrices(new Set([originalMatrix.spotId]))
      }
    } catch (error) {
      console.error('Error loading matrices:', error)
    }
  }

  const toggleMatrix = (spotId) => {
    const newSet = new Set(expandedMatrices)
    if (newSet.has(spotId)) {
      newSet.delete(spotId)
    } else {
      newSet.add(spotId)
    }
    setExpandedMatrices(newSet)
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
        loadUserMatrices()
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

  // Buy Points (Mock)
  const handleBuyPoints = async () => {
    if (!buyAmount || parseInt(buyAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setBuyLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newPoints = (userData?.master_points || 0) + parseInt(buyAmount)
      setUserData({ ...userData, master_points: newPoints })
      setStats({ ...stats, master_points: newPoints })
      
      alert(`✅ Added ${parseInt(buyAmount).toLocaleString()} points to your account!`)
      setShowBuyModal(false)
      setBuyAmount('')
      loadUserData()
    } catch (error) {
      alert('Error processing purchase')
    } finally {
      setBuyLoading(false)
    }
  }

  // Cash Out (Mock)
  const handleCashout = async () => {
    if (!cashoutAmount || parseInt(cashoutAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (parseInt(cashoutAmount) > (userData?.master_points || 0)) {
      alert('Insufficient points')
      return
    }

    setCashoutLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newPoints = (userData?.master_points || 0) - parseInt(cashoutAmount)
      setUserData({ ...userData, master_points: newPoints })
      setStats({ ...stats, master_points: newPoints })
      
      alert(`✅ Cashout request submitted for ${parseInt(cashoutAmount).toLocaleString()} points.`)
      setShowCashoutModal(false)
      setCashoutAmount('')
      loadUserData()
    } catch (error) {
      alert('Error processing cashout')
    } finally {
      setCashoutLoading(false)
    }
  }

  const searchUsers = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      const response = await fetch(SEARCH_USERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          excludeUserId: currentSession.user.id
        })
      })

      const result = await response.json()
      if (result.success) {
        setSearchResults(result.users)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const selectRecipient = (user) => {
    setSelectedRecipient(user)
    setSearchQuery('')
    setSearchResults([])
  }

  const openTransferModal = () => {
    setSelectedRecipient(null)
    setSearchQuery('')
    setSearchResults([])
    setTransferAmount('')
    setTransferDescription('')
    setTransferPassword('')
    setShowTransferModal(true)
  }

  const openVerifyModal = () => {
    if (!selectedRecipient) {
      alert('Please select a recipient')
      return
    }
    if (!transferAmount || parseInt(transferAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }
    if (parseInt(transferAmount) > (userData?.master_points || 0)) {
      alert('Insufficient points')
      return
    }
    setShowVerifyModal(true)
  }

  const confirmTransfer = async () => {
    if (!transferPassword) {
      alert('Please enter your password')
      return
    }

    setTransferLoading(true)
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentSession.user.email,
        password: transferPassword
      })

      if (signInError) {
        alert('Incorrect password. Transfer cancelled.')
        setShowVerifyModal(false)
        setTransferLoading(false)
        return
      }

      const response = await fetch(TRANSFER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: currentSession.user.id,
          toUserCode: selectedRecipient.referral_code,
          amount: parseInt(transferAmount),
          description: transferDescription
        })
      })

      const result = await response.json()
      if (result.success) {
        alert(`✅ ${result.message}`)
        setShowTransferModal(false)
        setShowVerifyModal(false)
        setSelectedRecipient(null)
        setTransferAmount('')
        setTransferDescription('')
        setTransferPassword('')
        loadUserData()
      } else {
        alert(`❌ ${result.message}`)
      }
    } catch (error) {
      alert('Error processing transfer')
    } finally {
      setTransferLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    sessionStorage.removeItem('isAdmin')
    navigate('/login')
  }

  const renderMatrixVisualization = (matrix) => {
    const isExpanded = expandedMatrices.has(matrix.spotId)
    
    const renderLevel1Spots = () => {
      const spots = []
      for (let pos = 1; pos <= 4; pos++) {
        const occupant = matrix.level1.find(s => s.position === pos)
        spots.push(
          <div key={pos} style={{
            width: '70px',
            height: '70px',
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
              <div style={{ color: occupant.isSelf ? '#ffa502' : '#00ff88', fontSize: '11px', fontWeight: 'bold' }}>
                {occupant.isSelf ? 'SELF' : occupant.user_name?.substring(0, 6)}
              </div>
            ) : (
              <div style={{ color: '#ff6666', fontSize: '10px' }}>Empty</div>
            )}
          </div>
        )
      }
      return spots
    }

    return (
      <div key={matrix.spotId} style={{ marginBottom: '20px', border: '1px solid rgba(0, 255, 255, 0.2)', borderRadius: '10px', overflow: 'hidden' }}>
        <div 
          onClick={() => toggleMatrix(matrix.spotId)}
          style={{
            background: matrix.isOriginal ? '#1a3a3a' : '#2a2a4a',
            padding: '12px 15px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <span style={{ color: '#00ff88', fontWeight: 'bold' }}>
              {matrix.isOriginal ? '⭐ Original Matrix' : '📌 Self-Sponsored Matrix'}
            </span>
            <span style={{ color: '#888', fontSize: '11px', marginLeft: '10px' }}>
              Level {matrix.level}, Pos {matrix.position}
            </span>
            <span style={{ color: '#ffa502', fontSize: '11px', marginLeft: '10px' }}>
              {matrix.filledCount}/85 spots
            </span>
          </div>
          <div style={{ color: '#00ccff', fontSize: '18px' }}>
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
        
        {isExpanded && (
          <div style={{ padding: '15px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'inline-block', background: '#0a0a2a', padding: '10px 20px', borderRadius: '10px', border: '2px solid #ffd700' }}>
                <div style={{ fontSize: '10px', color: '#888' }}>Level 0</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffd700' }}>👤 YOU</div>
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <span style={{ color: '#ffa502', fontWeight: 'bold', fontSize: '12px' }}>LEVEL 1</span>
                <span style={{ color: '#888', fontSize: '10px', marginLeft: '10px' }}>(4 spots)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {renderLevel1Spots()}
              </div>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <div style={{ textAlign: 'center', marginBottom: '5px' }}>
                <span style={{ color: '#ffa502', fontWeight: 'bold', fontSize: '12px' }}>LEVEL 2-4</span>
              </div>
              <div style={{ background: '#0a0a2a', height: '15px', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${((matrix.level2.length + matrix.level3.length + matrix.level4.length) / 336) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #00ccff, #00ff88)' }}></div>
              </div>
              <p style={{ textAlign: 'center', fontSize: '11px', color: '#aaa', marginTop: '5px' }}>
                L2: {matrix.level2.length}/16 | L3: {matrix.level3.length}/64 | L4: {matrix.level4.length}/256
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #00ff88', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'white', marginTop: '15px' }}>Loading...</p>
        </div>
      </div>
    )
  }

  const referralLink = `${window.location.origin}/signup?ref=${userData?.referral_code || ''}`

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
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
            <h3 style={{ color: '#aaa' }}>Your Points</h3>
            <h2 style={{ color: '#00ff88' }}>{stats.master_points.toLocaleString()}</h2>
          </div>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
            <h3 style={{ color: '#aaa' }}>Commission Earned</h3>
            <h2 style={{ color: '#00ff88' }}>{stats.commission_earned.toLocaleString()}</h2>
          </div>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
            <h3 style={{ color: '#aaa' }}>Spots Filled</h3>
            <h2 style={{ color: '#00ff88' }}>{stats.spots_filled} / {stats.total_spots}</h2>
          </div>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
            <h3 style={{ color: '#aaa' }}>Recovery Fund</h3>
            <h2 style={{ color: '#00ff88' }}>{stats.recovery_fund.toLocaleString()}</h2>
          </div>
        </div>

        {/* My Matrices Section */}
        <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
          <h2 style={{ color: '#00ccff', marginBottom: '20px' }}>📁 MY MATRICES</h2>
          {userMatrices.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>No matrices found.</p>
          ) : (
            userMatrices.map(matrix => renderMatrixVisualization(matrix))
          )}
        </div>

        {/* Actions Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
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
                style={{ width: '100%', padding: '10px', background: '#333', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer', marginBottom: '10px' }}
              >
                📋 Copy Code
              </button>
              
              <p style={{ color: '#aaa', marginBottom: '8px', marginTop: '15px' }}>Your Referral Link:</p>
              <code style={{ display: 'block', background: '#0a0a2a', padding: '10px', borderRadius: '5px', textAlign: 'center', color: '#00ff88', marginBottom: '10px', wordBreak: 'break-all', fontSize: '12px' }}>
                {referralLink}
              </code>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(referralLink)
                  alert('Referral link copied! Share it with friends.')
                }}
                style={{ width: '100%', padding: '10px', background: '#00ccff', border: 'none', borderRadius: '5px', color: '#0a0a2a', fontWeight: 'bold', cursor: 'pointer' }}
              >
                🔗 Copy Referral Link
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
              onClick={() => setShowBuyModal(true)}
              style={{ width: '100%', padding: '12px', background: '#00aaff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px', color: 'white' }}
            >
              💰 Buy Points
            </button>

            <button 
              onClick={() => setShowCashoutModal(true)}
              style={{ width: '100%', padding: '12px', background: '#ffaa00', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px', color: '#0a0a2a' }}
            >
              💸 Cash Out
            </button>

            <button 
              onClick={openTransferModal}
              style={{ width: '100%', padding: '12px', background: '#9b59b6', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px', color: 'white' }}
            >
              💸 Transfer Points to Another User
            </button>

            <button 
              onClick={() => {
                loadUserData()
                loadUserMatrices()
              }}
              style={{ width: '100%', padding: '12px', background: '#333', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer' }}
            >
              🔄 Refresh Dashboard
            </button>
          </div>

          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px' }}>
            <h2 style={{ color: '#00ccff', marginBottom: '20px' }}>📊 System Stats</h2>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <p style={{ color: '#aaa' }}>Matrix Fill Progress</p>
                <div style={{ background: '#0a0a2a', height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${(stats.spots_filled / stats.total_spots) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #00ccff, #00ff88)' }}></div>
                </div>
                <p style={{ color: '#00ff88', marginTop: '10px' }}>{stats.spots_filled} / {stats.total_spots} spots filled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Section */}
        <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px' }}>
          <h2 style={{ color: '#00ccff', marginBottom: '20px' }}>📜 Recent Transactions</h2>
          {transactions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#aaa', padding: '20px' }}>No transactions yet</p>
          ) : (
            transactions.slice(0, 10).map((tx, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #333' }}>
                <div style={{ color: '#aaa' }}>{new Date(tx.timestamp).toLocaleDateString()}</div>
                <div style={{ color: '#aaa' }}>{tx.type.replace(/_/g, ' ').toUpperCase()}</div>
                <div style={{ color: tx.amount > 0 ? '#00ff88' : '#ff6666' }}>{tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}</div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '30px', padding: '20px', color: '#555' }}>
          <p>Together We Will All Prosper</p>
        </div>
      </div>

      {/* Buy Points Modal */}
      {showBuyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a3a', padding: '30px', borderRadius: '10px', maxWidth: '450px', width: '90%', border: '2px solid #00aaff' }}>
            <h2 style={{ color: '#00aaff', marginBottom: '20px' }}>💰 Buy Points</h2>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: 'white', marginBottom: '10px' }}>Your balance: <strong style={{ color: '#00ff88' }}>{userData?.master_points?.toLocaleString()} points</strong></p>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Points to purchase</label>
              <input
                type="number"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                placeholder="Enter amount"
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #00aaff', background: '#0a0a2a', color: 'white' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleBuyPoints}
                disabled={buyLoading}
                style={{ flex: 1, padding: '12px', background: '#00aaff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: buyLoading ? 'not-allowed' : 'pointer', color: 'white' }}
              >
                {buyLoading ? 'Processing...' : 'Confirm Purchase'}
              </button>
              <button
                onClick={() => setShowBuyModal(false)}
                style={{ flex: 1, padding: '12px', background: '#333', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Out Modal */}
      {showCashoutModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a3a', padding: '30px', borderRadius: '10px', maxWidth: '450px', width: '90%', border: '2px solid #ffaa00' }}>
            <h2 style={{ color: '#ffaa00', marginBottom: '20px' }}>💸 Cash Out</h2>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: 'white', marginBottom: '10px' }}>Your balance: <strong style={{ color: '#00ff88' }}>{userData?.master_points?.toLocaleString()} points</strong></p>
              <p style={{ color: '#ffaa00', fontSize: '12px' }}>Minimum: 10,000 points</p>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Points to cash out</label>
              <input
                type="number"
                value={cashoutAmount}
                onChange={(e) => setCashoutAmount(e.target.value)}
                placeholder="Enter amount"
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ffaa00', background: '#0a0a2a', color: 'white' }}
              />
            </div>
            <div style={{ marginBottom: '20px', background: '#0a0a2a', padding: '10px', borderRadius: '5px' }}>
              <p style={{ color: '#aaa', marginBottom: '5px' }}>Estimated value:</p>
              <p style={{ color: '#00ff88' }}>${((parseInt(cashoutAmount) || 0) * 0.005).toFixed(2)} USD</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleCashout}
                disabled={cashoutLoading}
                style={{ flex: 1, padding: '12px', background: '#ffaa00', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: cashoutLoading ? 'not-allowed' : 'pointer', color: '#0a0a2a' }}
              >
                {cashoutLoading ? 'Processing...' : 'Request Cashout'}
              </button>
              <button
                onClick={() => setShowCashoutModal(false)}
                style={{ flex: 1, padding: '12px', background: '#333', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a3a', padding: '30px', borderRadius: '10px', maxWidth: '500px', width: '90%', border: '2px solid #9b59b6' }}>
            <h2 style={{ color: '#9b59b6', marginBottom: '20px' }}>💸 Transfer Points</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Search Recipient (Email or Referral Code)</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value.length >= 2) {
                    setTimeout(() => searchUsers(), 300)
                  } else {
                    setSearchResults([])
                  }
                }}
                placeholder="Enter email or referral code..."
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #9b59b6', background: '#0a0a2a', color: 'white' }}
              />
              {searchLoading && <p style={{ color: '#888', fontSize: '12px', marginTop: '5px' }}>Searching...</p>}
              {searchResults.length > 0 && (
                <div style={{ marginTop: '10px', border: '1px solid #9b59b6', borderRadius: '5px', maxHeight: '150px', overflowY: 'auto' }}>
                  {searchResults.map(user => (
                    <div
                      key={user.id}
                      onClick={() => selectRecipient(user)}
                      style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #333', background: '#0a0a2a' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a4a'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#0a0a2a'}
                    >
                      <div style={{ color: '#00ff88' }}>{user.referral_code}</div>
                      <div style={{ color: '#888', fontSize: '12px' }}>{user.email}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedRecipient && (
              <div style={{ marginBottom: '15px', padding: '10px', background: '#0a0a2a', borderRadius: '5px', border: '1px solid #9b59b6' }}>
                <p style={{ color: '#00ff88', marginBottom: '5px' }}>Recipient: {selectedRecipient.referral_code}</p>
                <p style={{ color: '#888', fontSize: '12px' }}>{selectedRecipient.email}</p>
              </div>
            )}
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Amount (points)</label>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Enter amount"
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #9b59b6', background: '#0a0a2a', color: 'white' }}
              />
              <p style={{ color: '#888', fontSize: '12px', marginTop: '5px' }}>Your balance: {userData?.master_points?.toLocaleString()} points</p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Description (optional)</label>
              <input
                type="text"
                value={transferDescription}
                onChange={(e) => setTransferDescription(e.target.value)}
                placeholder="Reason for transfer"
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #9b59b6', background: '#0a0a2a', color: 'white' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={openVerifyModal}
                disabled={!selectedRecipient || !transferAmount}
                style={{ flex: 1, padding: '12px', background: '#9b59b6', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: (!selectedRecipient || !transferAmount) ? 'not-allowed' : 'pointer', color: 'white', opacity: (!selectedRecipient || !transferAmount) ? 0.5 : 1 }}
              >
                Continue
              </button>
              <button
                onClick={() => setShowTransferModal(false)}
                style={{ flex: 1, padding: '12px', background: '#333', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {showVerifyModal && selectedRecipient && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a3a', padding: '30px', borderRadius: '10px', maxWidth: '500px', width: '90%', border: '2px solid #ffa502' }}>
            <h2 style={{ color: '#ffa502', marginBottom: '20px' }}>🔐 Verify Transfer</h2>
            
            <div style={{ marginBottom: '20px', padding: '15px', background: '#0a0a2a', borderRadius: '5px' }}>
              <p style={{ color: 'white', marginBottom: '10px' }}>Transfer Details:</p>
              <p style={{ color: '#00ff88' }}>To: {selectedRecipient.referral_code}</p>
              <p style={{ color: '#888', fontSize: '12px', marginBottom: '10px' }}>{selectedRecipient.email}</p>
              <p style={{ color: '#ffa502' }}>Amount: {parseInt(transferAmount).toLocaleString()} points</p>
              {transferDescription && <p style={{ color: '#aaa' }}>Description: {transferDescription}</p>}
              <p style={{ color: '#ff6666', marginTop: '10px' }}>Fee: 0 points</p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Enter your password to confirm</label>
              <input
                type="password"
                value={transferPassword}
                onChange={(e) => setTransferPassword(e.target.value)}
                placeholder="Your password"
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ffa502', background: '#0a0a2a', color: 'white' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={confirmTransfer}
                disabled={transferLoading}
                style={{ flex: 1, padding: '12px', background: '#ffa502', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: transferLoading ? 'not-allowed' : 'pointer', color: '#0a0a2a' }}
              >
                {transferLoading ? 'Processing...' : 'Confirm Transfer'}
              </button>
              <button
                onClick={() => {
                  setShowVerifyModal(false)
                  setTransferPassword('')
                }}
                style={{ flex: 1, padding: '12px', background: '#333', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserDashboard