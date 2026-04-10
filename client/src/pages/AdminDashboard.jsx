import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [matrices, setMatrices] = useState([])
  const [transactions, setTransactions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDescription, setTransferDescription] = useState('')
  const [transferFrom, setTransferFrom] = useState('admin_fees')
  const [transferLoading, setTransferLoading] = useState(false)
  const [stats, setStats] = useState({
    totalUsers: 0,
    spotsFilled: 0,
    totalSpots: 341,
    recoveryFund: 0,
    adminFees: 0,
    currentMatrixNumber: 1,
    completedMatrices: 0,
    percentFull: 0
  })

  const ADMIN_API_URL = 'https://iqctlwnlesnimzzatwry.supabase.co/functions/v1/admin-stats'
  const TRANSFER_API_URL = 'https://iqctlwnlesnimzzatwry.supabase.co/functions/v1/transfer-points-admin'
  const DISABLE_USER_URL = 'https://iqctlwnlesnimzzatwry.supabase.co/functions/v1/disable-user'

  useEffect(() => {
    loadAdminData()
  }, [])

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredUsers(users.slice(0, 35))
    } else {
      const term = searchTerm.toLowerCase()
      setFilteredUsers(users.filter(user => 
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.referral_code?.toLowerCase().includes(term)
      ).slice(0, 35))
    }
  }, [searchTerm, users])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(ADMIN_API_URL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        setUsers(result.users || [])
        setFilteredUsers((result.users || []).slice(0, 35))
        setMatrices(result.matrices || [])
        setTransactions(result.transactions || [])
        setStats({
          totalUsers: result.totalUsers || 0,
          spotsFilled: result.spotsFilled || 0,
          totalSpots: result.totalSpots || 341,
          recoveryFund: result.recoveryFund || 0,
          adminFees: result.adminFees || 0,
          currentMatrixNumber: result.currentMatrixNumber || 1,
          completedMatrices: result.completedMatrices || 0,
          percentFull: Math.round(((result.spotsFilled || 0) / 341) * 100)
        })
      }
    } catch (error) {
      console.error('Error loading admin data:', error)
      alert('Error loading admin data')
    } finally {
      setLoading(false)
    }
  }

  const simulateSignups = async () => {
    const count = prompt('How many signups to simulate?', '5')
    if (!count) return
    
    try {
      const response = await fetch('https://iqctlwnlesnimzzatwry.supabase.co/functions/v1/simulate-signups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: parseInt(count) })
      })
      
      const result = await response.json()
      if (result.success) {
        alert(`✅ ${result.message}`)
        loadAdminData()
      } else {
        alert(`❌ ${result.message}`)
      }
    } catch (error) {
      alert('Error simulating signups')
    }
  }

  const resetSystem = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL data. This action cannot be undone. Are you absolutely sure?')) return
    
    try {
      const response = await fetch('https://iqctlwnlesnimzzatwry.supabase.co/functions/v1/reset-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      if (result.success) {
        alert('✅ System reset successfully')
        loadAdminData()
      } else {
        alert(`❌ ${result.message}`)
      }
    } catch (error) {
      alert('Error resetting system')
    }
  }

  const openTransferModal = (user) => {
    setSelectedUser(user)
    setTransferAmount('')
    setTransferDescription('')
    setTransferFrom('admin_fees')
    setShowTransferModal(true)
  }

  const handleTransfer = async () => {
    if (!transferAmount || parseInt(transferAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    let availableBalance = 0
    if (transferFrom === 'admin_fees') {
      availableBalance = stats.adminFees
    } else {
      availableBalance = stats.recoveryFund
    }

    if (parseInt(transferAmount) > availableBalance) {
      alert(`Insufficient balance in ${transferFrom === 'admin_fees' ? 'Admin Fees' : 'Recovery Fund'}. Available: ${availableBalance.toLocaleString()} points`)
      return
    }

    setTransferLoading(true)
    try {
      const response = await fetch(TRANSFER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: selectedUser.id,
          toUserEmail: selectedUser.email,
          amount: parseInt(transferAmount),
          description: transferDescription || 'Admin transfer',
          source: transferFrom
        })
      })
      
      const result = await response.json()
      if (result.success) {
        alert(`✅ Transferred ${transferAmount} points to ${selectedUser.name}`)
        setShowTransferModal(false)
        loadAdminData()
      } else {
        alert(`❌ ${result.message}`)
      }
    } catch (error) {
      alert('Error making transfer')
    } finally {
      setTransferLoading(false)
    }
  }

  const disableUser = async (user) => {
    if (!confirm(`⚠️ Disable user ${user.name}? They will not be able to log in or perform actions.`)) return
    
    try {
      const response = await fetch(DISABLE_USER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, disabled: true })
      })
      
      const result = await response.json()
      if (result.success) {
        alert(`✅ User ${user.name} has been disabled`)
        loadAdminData()
      } else {
        alert(`❌ ${result.message}`)
      }
    } catch (error) {
      alert('Error disabling user')
    }
  }

  const enableUser = async (user) => {
    if (!confirm(`Enable user ${user.name}?`)) return
    
    try {
      const response = await fetch(DISABLE_USER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, disabled: false })
      })
      
      const result = await response.json()
      if (result.success) {
        alert(`✅ User ${user.name} has been enabled`)
        loadAdminData()
      } else {
        alert(`❌ ${result.message}`)
      }
    } catch (error) {
      alert('Error enabling user')
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('isAdmin')
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #ffa502', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'white', marginTop: '15px' }}>Loading admin dashboard...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a3a', padding: '15px 30px', borderBottom: '1px solid #ffa502' }}>
        <h1 style={{ color: '#ffa502', margin: 0 }}>👑 THE MATRIX - ADMIN</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#ff4444', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer' }}>Logout</button>
      </div>

      <div style={{ maxWidth: '1400px', margin: '30px auto', padding: '0 20px' }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #ffa502' }}>
            <h3 style={{ color: '#aaa', marginBottom: '10px' }}>Total Users</h3>
            <h2 style={{ color: '#ffa502', fontSize: '32px', margin: 0 }}>{stats.totalUsers}</h2>
          </div>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #ffa502' }}>
            <h3 style={{ color: '#aaa', marginBottom: '10px' }}>Spots Filled</h3>
            <h2 style={{ color: '#ffa502', fontSize: '32px', margin: 0 }}>{stats.spotsFilled} / {stats.totalSpots}</h2>
          </div>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #ffa502' }}>
            <h3 style={{ color: '#aaa', marginBottom: '10px' }}>Recovery Fund</h3>
            <h2 style={{ color: '#ffa502', fontSize: '32px', margin: 0 }}>{stats.recoveryFund.toLocaleString()}</h2>
          </div>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #ffa502' }}>
            <h3 style={{ color: '#aaa', marginBottom: '10px' }}>Admin Fees</h3>
            <h2 style={{ color: '#ffa502', fontSize: '32px', margin: 0 }}>{stats.adminFees.toLocaleString()}</h2>
          </div>
        </div>

        {/* Second Row Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #ffa502' }}>
            <h3 style={{ color: '#aaa', marginBottom: '10px' }}>Current Matrix</h3>
            <h2 style={{ color: '#ffa502', fontSize: '32px', margin: 0 }}>#{stats.currentMatrixNumber}</h2>
          </div>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #ffa502' }}>
            <h3 style={{ color: '#aaa', marginBottom: '10px' }}>Completed Matrices</h3>
            <h2 style={{ color: '#ffa502', fontSize: '32px', margin: 0 }}>{stats.completedMatrices}</h2>
          </div>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #ffa502' }}>
            <h3 style={{ color: '#aaa', marginBottom: '10px' }}>Matrix Fill %</h3>
            <h2 style={{ color: '#ffa502', fontSize: '32px', margin: 0 }}>{stats.percentFull}%</h2>
          </div>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', textAlign: 'center', border: '1px solid #ffa502' }}>
            <h3 style={{ color: '#aaa', marginBottom: '10px' }}>Active Matrices</h3>
            <h2 style={{ color: '#ffa502', fontSize: '32px', margin: 0 }}>{matrices.filter(m => m.is_active).length}</h2>
          </div>
        </div>

        {/* Admin Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px' }}>
            <h2 style={{ color: '#ffa502', marginBottom: '15px' }}>👑 Admin Controls</h2>
            <button onClick={loadAdminData} style={{ width: '100%', padding: '12px', background: '#ffa502', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px', color: '#0a0a2a' }}>
              🔄 Refresh Data
            </button>
            <button onClick={simulateSignups} style={{ width: '100%', padding: '12px', background: '#ffa502', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px', color: '#0a0a2a' }}>
              🤖 Simulate Signups
            </button>
            <button onClick={resetSystem} style={{ width: '100%', padding: '12px', background: '#ff4444', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', color: 'white' }}>
              ⚠️ Reset Entire System
            </button>
          </div>

          <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px' }}>
            <h2 style={{ color: '#ffa502', marginBottom: '15px' }}>🔍 Search Users</h2>
            <input
              type="text"
              placeholder="Search by name, email, or referral code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ffa502', background: '#0a0a2a', color: 'white', marginBottom: '10px' }}
            />
            <p style={{ color: '#aaa', fontSize: '12px' }}>{filteredUsers.length} users found</p>
          </div>
        </div>

        {/* Users Table */}
        <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
          <h2 style={{ color: '#ffa502', marginBottom: '20px' }}>👥 All Users (Last 35)</h2>
          <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#1a1a3a' }}>
                <tr style={{ borderBottom: '1px solid #ffa502' }}>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#ffa502' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#ffa502' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#ffa502' }}>Email</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#ffa502' }}>Points</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#ffa502' }}>Commission</th>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#ffa502' }}>Referral Code</th>
                  <th style={{ textAlign: 'center', padding: '10px', color: '#ffa502' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '10px', color: '#ffa502' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '10px', color: '#aaa', fontSize: '12px' }}>{user.id?.substring(0, 8)}...</td>
                    <td style={{ padding: '10px', color: 'white' }}>{user.name}</td>
                    <td style={{ padding: '10px', color: '#aaa' }}>{user.email}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#00ff88' }}>{user.master_points?.toLocaleString()}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#ffa502' }}>{user.commission_earned?.toLocaleString()}</td>
                    <td style={{ padding: '10px', color: '#aaa' }}><code style={{ fontSize: '11px' }}>{user.referral_code}</code></td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{ 
                        background: user.disabled ? '#ff4444' : '#00ff88', 
                        color: user.disabled ? 'white' : '#0a0a2a',
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {user.disabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => openTransferModal(user)}
                          style={{ background: '#00ccff', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: 'white' }}
                          title="Transfer Points"
                        >
                          $
                        </button>
                        {user.disabled ? (
                          <button
                            onClick={() => enableUser(user)}
                            style={{ background: '#00ff88', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: 'white' }}
                            title="Enable User"
                          >
                            ✅
                          </button>
                        ) : (
                          <button
                            onClick={() => disableUser(user)}
                            style={{ background: '#ff4444', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: 'white' }}
                            title="Disable User"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div style={{ background: '#1a1a3a', padding: '20px', borderRadius: '10px' }}>
          <h2 style={{ color: '#ffa502', marginBottom: '20px' }}>📜 Recent Transactions</h2>
          <div style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#1a1a3a' }}>
                <tr style={{ borderBottom: '1px solid #ffa502' }}>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#ffa502' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#ffa502' }}>User</th>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#ffa502' }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#ffa502' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#ffa502' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 30).map((tx, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '10px', color: '#aaa', fontSize: '12px' }}>{new Date(tx.timestamp).toLocaleString()}</td>
                    <td style={{ padding: '10px', color: 'white' }}>{tx.user_name}</td>
                    <td style={{ padding: '10px', color: '#aaa' }}>{tx.type?.replace(/_/g, ' ').toUpperCase()}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: tx.amount > 0 ? '#00ff88' : '#ff6666' }}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount?.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px', color: '#aaa' }}>{tx.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a3a', padding: '30px', borderRadius: '10px', maxWidth: '500px', width: '90%', border: '2px solid #ffa502' }}>
            <h2 style={{ color: '#ffa502', marginBottom: '20px' }}>💸 Transfer Points</h2>
            
            <div style={{ marginBottom: '15px', padding: '10px', background: '#0a0a2a', borderRadius: '5px' }}>
              <p style={{ color: 'white', marginBottom: '5px' }}>To: <strong>{selectedUser?.name}</strong> ({selectedUser?.email})</p>
              <p style={{ color: '#00ff88', marginBottom: '5px' }}>User's Points: {selectedUser?.master_points?.toLocaleString()}</p>
            </div>

            <div style={{ marginBottom: '15px', padding: '10px', background: '#0a0a2a', borderRadius: '5px' }}>
              <p style={{ color: '#ffa502', marginBottom: '5px' }}>💰 Admin Fees Balance: {stats.adminFees.toLocaleString()} points</p>
              <p style={{ color: '#ffa502', marginBottom: '5px' }}>🏦 Recovery Fund Balance: {stats.recoveryFund.toLocaleString()} points</p>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Transfer From</label>
              <select
                value={transferFrom}
                onChange={(e) => setTransferFrom(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ffa502', background: '#0a0a2a', color: 'white' }}
              >
                <option value="admin_fees">Admin Fees Balance</option>
                <option value="recovery_fund">Recovery Fund Balance</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Amount (points)</label>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Enter amount"
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ffa502', background: '#0a0a2a', color: 'white' }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Description (optional)</label>
              <input
                type="text"
                value={transferDescription}
                onChange={(e) => setTransferDescription(e.target.value)}
                placeholder="Reason for transfer"
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ffa502', background: '#0a0a2a', color: 'white' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleTransfer}
                disabled={transferLoading}
                style={{ flex: 1, padding: '12px', background: '#ffa502', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: transferLoading ? 'not-allowed' : 'pointer', color: '#0a0a2a' }}
              >
                {transferLoading ? 'Processing...' : 'Confirm Transfer'}
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
    </div>
  )
}

export default AdminDashboard