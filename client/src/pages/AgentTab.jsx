// client/src/pages/AgentTab.jsx
// THE MATRIX V5.0 - Complete Agent Dashboard with Withdrawal Management
// UPDATED: Responsive mobile layout for stats tiles

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

function AgentTab({ userId }) {
  const [loading, setLoading] = useState(true)
  const [agentCodes, setAgentCodes] = useState([])
  const [agentInfo, setAgentInfo] = useState(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestQuantity, setRequestQuantity] = useState(10)
  const [requestTier, setRequestTier] = useState('consignment')
  const [requestLoading, setRequestLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  
  // Withdrawal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState('points')
  const [withdrawWallet, setWithdrawWallet] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawalHistory, setWithdrawalHistory] = useState([])

  // Check screen size for responsive layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    loadAgentData()
    loadWithdrawalHistory()
  }, [userId])

  const loadAgentData = async () => {
    setLoading(true)
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_agent, agent_tier, agent_code, agent_total_codes_sold, agent_commission_balance, agent_consignment_owed, name, email, alias')
        .eq('id', userId)
        .single()

      if (userError) throw userError
      setAgentInfo(userData)

      const { data: codesData, error: codesError } = await supabase
        .from('activation_codes')
        .select('*')
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false })

      if (codesError) throw codesError
      setAgentCodes(codesData || [])
    } catch (err) {
      console.error('Error loading agent data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadWithdrawalHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_withdrawals')
        .select('*')
        .eq('agent_id', userId)
        .order('requested_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        setWithdrawalHistory(data)
      }
    } catch (err) {
      console.error('Error loading withdrawal history:', err)
    }
  }

  const requestMoreCodes = async () => {
    if (requestQuantity < 1 || requestQuantity > 50) {
      alert('Quantity must be between 1 and 50')
      return
    }

    setRequestLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`${SUPABASE_URL}/functions/v1/agent-request-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          agentId: userId,
          quantity: requestQuantity,
          tier: requestTier
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`✅ Request for ${requestQuantity} codes submitted! Admin will review.`)
        setShowRequestModal(false)
        setRequestQuantity(10)
      } else {
        alert('❌ ' + result.error)
      }
    } catch (error) {
      alert('Error submitting request: ' + error.message)
    } finally {
      setRequestLoading(false)
    }
  }

  const requestWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount)
    
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (amount < 10) {
      alert('Minimum withdrawal amount is $10')
      return
    }

    const currentBalance = agentInfo?.agent_commission_balance || 0
    if (amount > currentBalance) {
      alert(`Insufficient balance. Available: $${currentBalance.toFixed(2)}`)
      return
    }

    if (withdrawMethod === 'crypto' && !withdrawWallet) {
      alert('Please enter your wallet address')
      return
    }

    setWithdrawLoading(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agent-request-withdrawal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          agentId: userId,
          amount: amount,
          method: withdrawMethod,
          walletAddress: withdrawWallet
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`✅ ${result.message}`)
        setShowWithdrawModal(false)
        setWithdrawAmount('')
        setWithdrawWallet('')
        loadAgentData()
        loadWithdrawalHistory()
      } else {
        alert('❌ ' + result.error)
      }
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setWithdrawLoading(false)
    }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    alert('Code copied!')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadge = (status, expiresAt) => {
    if (status === 'used') {
      return <span style={{ background: '#666', color: '#aaa', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>Used</span>
    }
    if (status === 'expired' || (expiresAt && new Date(expiresAt) < new Date())) {
      return <span style={{ background: '#ff4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>Expired</span>
    }
    return <span style={{ background: '#00ff88', color: '#0a0a2a', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>Active</span>
  }

  const StatTile = ({ icon, label, value, color, button }) => (
    <div style={{ 
      background: '#0a0a2a', 
      padding: isMobile ? '12px 8px' : '15px', 
      borderRadius: 10, 
      textAlign: 'center', 
      border: `1px solid ${color || '#9b59b6'}`,
      minWidth: isMobile ? 'calc(33.33% - 10px)' : 'auto',
      flex: isMobile ? '0 0 auto' : 1
    }}>
      <div style={{ fontSize: isMobile ? 20 : 24, marginBottom: 5 }}>{icon}</div>
      <div style={{ color: '#aaa', fontSize: isMobile ? 10 : 12 }}>{label}</div>
      {value !== undefined ? (
        <div style={{ color: color || '#9b59b6', fontSize: isMobile ? 22 : 28, fontWeight: 'bold' }}>{value}</div>
      ) : (
        button
      )}
    </div>
  )

  if (loading) {
    return (
      <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid #9b59b6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#aaa', marginTop: 10 }}>Loading agent data...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, textAlign: 'center' }}>
        <p style={{ color: '#ff4444' }}>Error loading agent data: {error}</p>
        <button onClick={loadAgentData} style={{ marginTop: 10, padding: '8px 16px', background: '#9b59b6', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white' }}>Retry</button>
      </div>
    )
  }

  const activeCodes = agentCodes.filter(c => c.status === 'active' && (!c.expires_at || new Date(c.expires_at) > new Date()))
  const usedCodes = agentCodes.filter(c => c.status === 'used')
  const totalCommission = (agentInfo?.agent_commission_balance || 0) + (agentInfo?.agent_consignment_owed || 0)

  return (
    <div style={{ background: '#1a1a3a', padding: isMobile ? 12 : 20, borderRadius: 10 }}>
      
      {/* Responsive Agent Info Cards - Flexbox with wrap for mobile */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
        justifyContent: isMobile ? 'center' : 'space-between'
      }}>
        <StatTile icon="🎫" label="Active Codes" value={activeCodes.length} color="#9b59b6" />
        <StatTile icon="✅" label="Codes Sold" value={usedCodes.length} color="#00ff88" />
        <StatTile icon="💰" label="Commission" value={`$${(agentInfo?.agent_commission_balance || 0).toFixed(2)}`} color="#ffa502" />
        <StatTile icon="🏷️" label="Your Tier" value={agentInfo?.agent_tier || 'Agent'} color="#00ccff" />
        <StatTile 
          icon="💸" 
          label="Withdraw" 
          button={
            <button 
              onClick={() => setShowWithdrawModal(true)} 
              style={{ 
                background: '#ffa502', 
                border: 'none', 
                borderRadius: 5, 
                padding: isMobile ? '6px 12px' : '8px 16px', 
                marginTop: 8, 
                cursor: 'pointer', 
                fontWeight: 'bold', 
                color: '#0a0a2a', 
                width: '100%',
                fontSize: isMobile ? 12 : 14
              }}
            >
              Request
            </button>
          } 
        />
      </div>

      {/* Your Agent Code */}
      <div style={{ background: '#0a0a2a', padding: 15, borderRadius: 10, marginBottom: 20, border: '1px solid #9b59b6' }}>
        <p style={{ color: '#aaa', marginBottom: 5, fontSize: isMobile ? 10 : 12 }}>Your Agent ID (share with admin for code requests)</p>
        <code style={{ 
          display: 'block', 
          background: '#1a1a3a', 
          padding: 10, 
          borderRadius: 5, 
          color: '#9b59b6', 
          textAlign: 'center', 
          fontSize: isMobile ? 12 : 14, 
          letterSpacing: 1,
          wordBreak: 'break-all'
        }}>
          {agentInfo?.agent_code || 'Not assigned'}
        </code>
      </div>

      {/* My Codes Table - Already scrolls horizontally */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ color: '#9b59b6', margin: 0, fontSize: isMobile ? 16 : 18 }}>📦 My Codes</h3>
          <button 
            onClick={() => setShowRequestModal(true)} 
            style={{ 
              padding: isMobile ? '6px 12px' : '8px 16px', 
              background: '#9b59b6', 
              border: 'none', 
              borderRadius: 5, 
              cursor: 'pointer', 
              color: 'white',
              fontSize: isMobile ? 12 : 14
            }}
          >
            📨 Request More Codes
          </button>
        </div>

        {agentCodes.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>No codes assigned yet. Request codes from admin.</p>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 600 : 'auto' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #9b59b6' }}>
                  <th style={{ textAlign: 'left', padding: 10, color: '#9b59b6', fontSize: isMobile ? 11 : 14 }}>Code</th>
                  <th style={{ textAlign: 'center', padding: 10, color: '#9b59b6', fontSize: isMobile ? 11 : 14 }}>Value</th>
                  <th style={{ textAlign: 'center', padding: 10, color: '#9b59b6', fontSize: isMobile ? 11 : 14 }}>Status</th>
                  <th style={{ textAlign: 'center', padding: 10, color: '#9b59b6', fontSize: isMobile ? 11 : 14 }}>Assigned</th>
                  <th style={{ textAlign: 'center', padding: 10, color: '#9b59b6', fontSize: isMobile ? 11 : 14 }}>Expires</th>
                  <th style={{ textAlign: 'center', padding: 10, color: '#9b59b6', fontSize: isMobile ? 11 : 14 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agentCodes.map(code => (
                  <tr key={code.id} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: 10, fontFamily: 'monospace', fontSize: isMobile ? 10 : 12, color: '#00ff88', wordBreak: 'break-all' }}>{code.code}</td>
                    <td style={{ padding: 10, textAlign: 'center', color: '#aaa', fontSize: isMobile ? 11 : 14 }}>{code.points_value?.toLocaleString()} pts</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>{getStatusBadge(code.status, code.expires_at)}</td>
                    <td style={{ padding: 10, textAlign: 'center', color: '#aaa', fontSize: isMobile ? 11 : 14 }}>{formatDate(code.assigned_at)}</td>
                    <td style={{ padding: 10, textAlign: 'center', color: '#aaa', fontSize: isMobile ? 11 : 14 }}>{formatDate(code.expires_at)}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>
                      {code.status === 'active' && (!code.expires_at || new Date(code.expires_at) > new Date()) && (
                        <button 
                          onClick={() => copyCode(code.code)} 
                          style={{ 
                            background: '#00ccff', 
                            border: 'none', 
                            borderRadius: 4, 
                            padding: isMobile ? '3px 6px' : '4px 8px', 
                            cursor: 'pointer', 
                            fontSize: isMobile ? 10 : 11, 
                            color: '#0a0a2a', 
                            fontWeight: 'bold' 
                          }}
                        >
                          📋 Copy
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdrawal History - Already responsive table */}
      <div style={{ marginTop: 20, background: '#0a0a2a', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: 15, borderBottom: '1px solid #333' }}>
          <h3 style={{ color: '#ffa502', margin: 0, fontSize: isMobile ? 16 : 18 }}>📜 Withdrawal History</h3>
        </div>
        {withdrawalHistory.length === 0 ? (
          <p style={{ padding: 20, textAlign: 'center', color: '#aaa' }}>No withdrawal requests yet</p>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 400 : 'auto' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <th style={{ padding: 12, textAlign: 'left', color: '#888', fontSize: isMobile ? 11 : 14 }}>Date</th>
                  <th style={{ padding: 12, textAlign: 'right', color: '#888', fontSize: isMobile ? 11 : 14 }}>Amount</th>
                  <th style={{ padding: 12, textAlign: 'center', color: '#888', fontSize: isMobile ? 11 : 14 }}>Method</th>
                  <th style={{ padding: 12, textAlign: 'center', color: '#888', fontSize: isMobile ? 11 : 14 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {withdrawalHistory.map(w => (
                  <tr key={w.id} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: 12, color: '#aaa', fontSize: isMobile ? 11 : 14 }}>{new Date(w.requested_at).toLocaleDateString()}</td>
                    <td style={{ padding: 12, textAlign: 'right', color: '#ffa502', fontWeight: 'bold', fontSize: isMobile ? 11 : 14 }}>${w.amount.toFixed(2)}</td>
                    <td style={{ padding: 12, textAlign: 'center', color: '#00ccff', textTransform: 'capitalize', fontSize: isMobile ? 11 : 14 }}>{w.method}</td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      {w.status === 'pending' && <span style={{ color: '#ffa502', fontSize: isMobile ? 11 : 14 }}>⏳ Pending</span>}
                      {w.status === 'approved' && <span style={{ color: '#00ccff', fontSize: isMobile ? 11 : 14 }}>📋 Approved</span>}
                      {w.status === 'completed' && <span style={{ color: '#00ff88', fontSize: isMobile ? 11 : 14 }}>✅ Completed</span>}
                      {w.status === 'rejected' && <span style={{ color: '#ff4444', fontSize: isMobile ? 11 : 14 }}>❌ Rejected</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Codes Modal - Already responsive */}
      {showRequestModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1a1a3a', padding: isMobile ? 20 : 30, borderRadius: 10, maxWidth: 500, width: '90%', border: '2px solid #9b59b6' }}>
            <h2 style={{ color: '#9b59b6', marginBottom: 20, fontSize: isMobile ? 20 : 24 }}>Request More Codes</h2>
            
            <div style={{ marginBottom: 15 }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: 5, fontSize: isMobile ? 12 : 14 }}>Quantity (1-50 codes)</label>
              <input 
                type="number" 
                value={requestQuantity} 
                onChange={(e) => setRequestQuantity(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))} 
                min="1" max="50"
                style={{ width: '100%', padding: 10, background: '#0a0a2a', color: 'white', border: '1px solid #9b59b6', borderRadius: 5 }}
              />
              <p style={{ color: '#666', fontSize: 11, marginTop: 5 }}>You will be notified when admin approves</p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: 5, fontSize: isMobile ? 12 : 14 }}>Purchase Tier</label>
              <select 
                value={requestTier} 
                onChange={(e) => setRequestTier(e.target.value)}
                style={{ width: '100%', padding: 10, background: '#0a0a2a', color: 'white', border: '1px solid #9b59b6', borderRadius: 5 }}
              >
                <option value="consignment">Consignment (2.5% commission, pay after sale)</option>
                <option value="prepaid">Pre-paid (5% commission, pay upfront)</option>
              </select>
            </div>

            <div style={{ background: '#0a0a2a', padding: 15, borderRadius: 10, marginBottom: 20 }}>
              <p style={{ color: '#aaa', marginBottom: 5, fontSize: isMobile ? 12 : 14 }}>Summary:</p>
              <p style={{ color: '#00ff88', fontSize: isMobile ? 14 : 16 }}>Codes requested: {requestQuantity}</p>
              <p style={{ color: '#ffa502', fontSize: isMobile ? 14 : 16 }}>Total Value: ${(requestQuantity * 500).toLocaleString()} BBD</p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
              <button onClick={requestMoreCodes} disabled={requestLoading} style={{ padding: 12, background: '#9b59b6', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer', color: 'white', flex: 1 }}>
                {requestLoading ? 'Submitting...' : 'Submit Request'}
              </button>
              <button onClick={() => { setShowRequestModal(false); setRequestQuantity(10) }} style={{ padding: 12, background: '#333', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal - Already responsive */}
      {showWithdrawModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1a1a3a', padding: isMobile ? 20 : 30, borderRadius: 10, maxWidth: 500, width: '90%', border: '2px solid #ffa502' }}>
            <h2 style={{ color: '#ffa502', marginBottom: 20, fontSize: isMobile ? 20 : 24 }}>💸 Withdraw Commission</h2>
            
            <div style={{ marginBottom: 15, background: '#0a0a2a', padding: 15, borderRadius: 10, textAlign: 'center' }}>
              <span style={{ color: '#aaa', fontSize: isMobile ? 12 : 14 }}>Available Balance</span>
              <div style={{ color: '#00ff88', fontSize: isMobile ? 28 : 32, fontWeight: 'bold' }}>${(agentInfo?.agent_commission_balance || 0).toFixed(2)}</div>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: 5, fontSize: isMobile ? 12 : 14 }}>Amount ($USD)</label>
              <input 
                type="number" 
                step="1"
                value={withdrawAmount} 
                onChange={(e) => setWithdrawAmount(e.target.value)} 
                placeholder="Min $10"
                style={{ width: '100%', padding: 10, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }}
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: 5, fontSize: isMobile ? 12 : 14 }}>Withdrawal Method</label>
              <select 
                value={withdrawMethod} 
                onChange={(e) => setWithdrawMethod(e.target.value)}
                style={{ width: '100%', padding: 10, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }}
              >
                <option value="points">Convert to Points (1 USD = 200 pts)</option>
                <option value="crypto">Crypto Wallet (USDT)</option>
              </select>
            </div>

            {withdrawMethod === 'crypto' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ color: '#aaa', display: 'block', marginBottom: 5, fontSize: isMobile ? 12 : 14 }}>Wallet Address (TRC20)</label>
                <input 
                  type="text" 
                  value={withdrawWallet} 
                  onChange={(e) => setWithdrawWallet(e.target.value)} 
                  placeholder="Enter your USDT wallet address"
                  style={{ width: '100%', padding: 10, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }}
                />
              </div>
            )}

            {withdrawMethod === 'points' && withdrawAmount && !isNaN(parseFloat(withdrawAmount)) && (
              <div style={{ marginBottom: 20, background: '#0a0a2a', padding: 10, borderRadius: 8 }}>
                <span style={{ color: '#aaa', fontSize: isMobile ? 12 : 14 }}>You will receive:</span>
                <span style={{ color: '#00ff88', fontWeight: 'bold', marginLeft: 10, fontSize: isMobile ? 12 : 14 }}>
                  {(parseFloat(withdrawAmount) * 200).toLocaleString()} points
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
              <button onClick={requestWithdrawal} disabled={withdrawLoading} style={{ padding: 12, background: '#ffa502', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer', color: '#0a0a2a', flex: 1 }}>
                {withdrawLoading ? 'Processing...' : 'Request Withdrawal'}
              </button>
              <button onClick={() => { setShowWithdrawModal(false); setWithdrawAmount(''); setWithdrawWallet('') }} style={{ padding: 12, background: '#333', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Note - Responsive */}
      <div style={{ marginTop: 20, padding: 15, background: '#0a0a2a', borderRadius: 10, border: '1px solid #333' }}>
        <p style={{ color: '#888', fontSize: isMobile ? 10 : 12, margin: 0 }}>
          💡 <strong>How it works:</strong> Each code sells for $500 BBD (50,000 points). 
          {agentInfo?.agent_tier === 'agent' && ' You earn 5% commission on pre-paid codes or 2.5% on consignment codes.'}
          Share codes with customers. When they activate, you earn commission. Withdraw your commission balance to points or crypto.
        </p>
      </div>
    </div>
  )
}

export default AgentTab