// client/src/pages/AgentTab.jsx
// THE MATRIX V5.2 - Complete Agent Dashboard
// UPDATED: Real data wiring for raffle tickets (replaces mock data)
// UPDATED: 200 pts = 1 USD conversion; MAX(10% of ticket_price_points, 100 pts) commission
// UPDATED: 4 tiles per sub-tab with "Withdraw ALL" acting on global agent_commission_balance
// UPDATED: Code Sales Summary + Ticket Sales Summary with Balance Due metric

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const PUBLIC_REDEEM_BASE = 'https://the-matrix.app/raffle/redeem'
const POINTS_PER_USD = 200

// ============================================================
// HELPERS
// ============================================================
const pointsToUsd = (points) => {
  if (points == null) return 0
  const n = Number(points)
  if (Number.isNaN(n)) return 0
  return n / POINTS_PER_USD
}

const formatUsd = (points) => `$${pointsToUsd(points).toFixed(2)}`

const buildRedemptionLink = (code) =>
  `${PUBLIC_REDEEM_BASE}?code=${encodeURIComponent(code)}`

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

  // Withdrawal state (shared across both sub-tabs)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState('points')
  const [withdrawWallet, setWithdrawWallet] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawalHistory, setWithdrawalHistory] = useState([])

  // Sub-tab navigation
  const [agentSubTab, setAgentSubTab] = useState('codes')

  // Raffle Tickets state — REAL DATA
  const [availableRaffles, setAvailableRaffles] = useState([])
  const [myTickets, setMyTickets] = useState([])
  const [raffleLookup, setRaffleLookup] = useState({}) // promotion_id → promotion row
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [ticketsError, setTicketsError] = useState(null)

    const [ticketFilter, setTicketFilter] = useState('all')
  const [ticketSearch, setTicketSearch] = useState('')
  // Item 1 — track which raffles have pending agent requests this session
  const [pendingRequestRaffleIds, setPendingRequestRaffleIds] = useState(new Set())

  // Raffle Tickets modals
  const [showRequestTicketModal, setShowRequestTicketModal] = useState(false)
  const [showTicketDetailModal, setShowTicketDetailModal] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [requestTicketLoading, setRequestTicketLoading] = useState(false)

  // Selected items
  const [selectedRaffle, setSelectedRaffle] = useState(null)
  const [selectedTicket, setSelectedTicket] = useState(null)

  // QR code state
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrGenerating, setQrGenerating] = useState(false)

  // Request ticket form
  const [ticketRequestQuantity, setTicketRequestQuantity] = useState(10)

  // Check screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    loadAgentData()
    loadWithdrawalHistory()
    loadRaffleData()
  }, [userId])

  // ============================================
  // LOADERS
  // ============================================
  const loadAgentData = async () => {
    setLoading(true)
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(
          'is_agent, agent_tier, agent_code, agent_total_codes_sold, agent_commission_balance, agent_consignment_owed, name, email, alias'
        )
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

  const loadRaffleData = async () => {
    setTicketsLoading(true)
    setTicketsError(null)
    try {
      // 1. Available raffles (active + allow_agent_distribution)
      const { data: rafflesData, error: rafflesErr } = await supabase
        .from('promotions')
        .select('id, title, description, prize_description, prize_points, entry_cost, start_date, end_date, is_active, allow_agent_distribution, agent_ticket_price_points, agent_commission_points, max_tickets_per_agent')
        .eq('allow_agent_distribution', true)
        .eq('is_active', true)
        .order('end_date', { ascending: true })

      if (rafflesErr) throw rafflesErr

      // Filter to raffles not yet ended
      const now = new Date()
      const activeRaffles = (rafflesData || []).filter(
        (r) => !r.end_date || new Date(r.end_date) > now
      )
      setAvailableRaffles(activeRaffles)

      // 2. Build raffle lookup map (for tickets joining)
      const lookup = {}
      ;(rafflesData || []).forEach((r) => {
        lookup[r.id] = r
      })

      // 3. Agent's tickets
      const { data: ticketsData, error: ticketsErr } = await supabase
        .from('raffle_tickets')
        .select('*')
        .eq('agent_id', userId)
        .order('created_at', { ascending: false })

      if (ticketsErr) throw ticketsErr
      const agentTickets = ticketsData || []

      // 4. Fetch missing raffles from tickets (to populate lookup for inactive raffles)
      const missingRaffleIds = [
        ...new Set(agentTickets.map(t => t.promotion_id).filter(Boolean))
      ].filter(id => !lookup[id])

      if (missingRaffleIds.length > 0) {
        const { data: missingRaffles } = await supabase
          .from('promotions')
          .select('id, title, description, prize_description, prize_points, entry_cost, start_date, end_date, is_active, allow_agent_distribution, agent_ticket_price_points, agent_commission_points, max_tickets_per_agent')
          .in('id', missingRaffleIds)
        
        if (missingRaffles) {
          missingRaffles.forEach((r) => {
            lookup[r.id] = r
          })
        }
      }

      setRaffleLookup(lookup)
      setMyTickets(agentTickets)
            // Item 1: load which raffles already have pending requests for this agent
      const { data: pendingReqs } = await supabase
        .from('raffle_ticket_requests')
        .select('promotion_id')
        .eq('agent_id', userId)
        .eq('status', 'pending')

      if (pendingReqs && pendingReqs.length > 0) {
        setPendingRequestRaffleIds(new Set(pendingReqs.map(r => r.promotion_id)))
      }
    } catch (err) {
      console.error('Error loading raffle data:', err)
      setTicketsError(err.message)
    } finally {
      setTicketsLoading(false)
    }
  }

  // ============================================
  // CODE REQUESTS
  // ============================================
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
          Authorization: `Bearer ${session?.access_token}`
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

  // ============================================
  // WITHDRAWAL
  // ============================================
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
          Authorization: `Bearer ${session?.access_token}`
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

  // ============================================
  // COPY HELPERS
  // ============================================
  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    alert('Code copied!')
  }

  const copyRedemptionLink = (code) => {
    navigator.clipboard.writeText(buildRedemptionLink(code))
    alert('Redemption link copied!')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadge = (status, expiresAt) => {
    if (status === 'used') {
      return (
        <span style={{ background: '#666', color: '#aaa', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
          Used
        </span>
      )
    }
    if (status === 'expired' || (expiresAt && new Date(expiresAt) < new Date())) {
      return (
        <span style={{ background: '#ff4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
          Expired
        </span>
      )
    }
    return (
      <span style={{ background: '#00ff88', color: '#0a0a2a', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
        Active
      </span>
    )
  }

  const getTicketStatusBadge = (status) => {
    const map = {
      available: { bg: '#666', color: '#aaa', text: 'Available' },
      active: { bg: '#9b59b6', color: 'white', text: 'Active' },
      redeemed: { bg: '#00ccff', color: '#0a0a2a', text: 'Redeemed' },
      expired: { bg: '#ff4444', color: 'white', text: 'Expired' }
    }
    const s = map[status] || { bg: '#666', color: '#aaa', text: status }
    return (
      <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
        {s.text}
      </span>
    )
  }

  // ============================================
  // DELIVERY HELPERS
  // ============================================
  const openWhatsAppLink = (ticket) => {
    const raffle = raffleLookup[ticket.promotion_id]
    const title = raffle?.title || 'Raffle Ticket'
    const link = buildRedemptionLink(ticket.ticket_code)
    const message =
      `🎟️ Your raffle ticket: ${title}\n` +
      `Ticket code: ${ticket.ticket_code}\n` +
      `Open here to claim: ${link}\n` +
      `Good luck! 🍀`
    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  const openQrModal = async (ticket) => {
    setSelectedTicket(ticket)
    setQrGenerating(true)
    setShowQrModal(true)
    try {
      const url = buildRedemptionLink(ticket.ticket_code)
      const dataUrl = await QRCode.toDataURL(url, {
        width: 600,
        margin: 2,
        color: { dark: '#0a0a2a', light: '#ffffff' }
      })
      setQrDataUrl(dataUrl)
    } catch (err) {
      console.error('QR generation error:', err)
      alert('Could not generate QR code. Please use Copy Link or WhatsApp instead.')
      setShowQrModal(false)
    } finally {
      setQrGenerating(false)
    }
  }

  const downloadQr = () => {
    if (!qrDataUrl || !selectedTicket) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `${selectedTicket.ticket_code}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const openRequestTicketModal = (raffle) => {
    setSelectedRaffle(raffle)
    setTicketRequestQuantity(Math.min(10, raffle.max_tickets_per_agent || 10))
    setShowRequestTicketModal(true)
  }

    const submitTicketRequest = async () => {
    if (!selectedRaffle) return

    setRequestTicketLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('❌ Session expired. Please log in again.')
        return
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-request-raffle-tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          agentId: userId,
          promotionId: selectedRaffle.id,
          quantity: ticketRequestQuantity
        })
      })

      const result = await res.json()

      if (result.success) {
        alert(
          `✅ Request for ${result.quantity} tickets to "${result.promotionTitle}" submitted! Admin will review.`
        )
        // Item 1: mark this raffle as having a pending request
        setPendingRequestRaffleIds(prev => new Set([...prev, selectedRaffle.id]))
        setShowRequestTicketModal(false)
        loadRaffleData()
      } else {
        alert('❌ ' + (result.error || 'Request failed'))
      }
    } catch (err) {
      alert('Error submitting request: ' + err.message)
    } finally {
      setRequestTicketLoading(false)
    }
  }

  const openTicketDetail = (ticket) => {
    setSelectedTicket(ticket)
    setShowTicketDetailModal(true)
  }

  // ============================================
  // DERIVED — My Codes
  // ============================================
  const activeCodes = agentCodes.filter(
    (c) => c.status === 'active' && (!c.expires_at || new Date(c.expires_at) > new Date())
  )
  const soldCodes = agentCodes.filter((c) => c.status === 'used')

  const codesRevenuePoints = soldCodes.reduce((sum, c) => sum + (c.points_value || 0), 0)
  const codesCommissionUsd = soldCodes.reduce((sum, c) => {
    const usd = (c.points_value || 0) / POINTS_PER_USD
    const rate = c.purchase_tier === 'prepaid' ? 0.05 : 0.025
    return sum + usd * rate
  }, 0)
  const codesRevenueUsd = codesRevenuePoints / POINTS_PER_USD
  const codesBalanceDueUsd = codesRevenueUsd - codesCommissionUsd

  // ============================================
  // DERIVED — Raffle Tickets (real data)
  // ============================================
  const activeTickets = myTickets.filter((t) => t.status === 'active')
  const redeemedTickets = myTickets.filter((t) => t.status === 'redeemed')

  const ticketsRevenuePoints = redeemedTickets.reduce((sum, t) => sum + (t.price_points || 0), 0)
  const ticketsCommissionPoints = redeemedTickets.reduce((sum, t) => sum + (t.commission_points || 0), 0)
  const ticketsRevenueUsd = ticketsRevenuePoints / POINTS_PER_USD
  const ticketsCommissionUsd = ticketsCommissionPoints / POINTS_PER_USD
  const ticketsBalanceDueUsd = ticketsRevenueUsd - ticketsCommissionUsd

  const filteredTickets = myTickets.filter((t) => {
    if (ticketFilter !== 'all' && t.status !== ticketFilter) return false
    if (ticketSearch) {
      const q = ticketSearch.toLowerCase()
      const raffleTitle = raffleLookup[t.promotion_id]?.title || ''
      return t.ticket_code.toLowerCase().includes(q) || raffleTitle.toLowerCase().includes(q)
    }
    return true
  })

  const StatTile = ({ icon, label, value, color, button }) => (
    <div
      style={{
        background: '#0a0a2a',
        padding: isMobile ? '12px 8px' : '15px',
        borderRadius: 10,
        textAlign: 'center',
        border: `1px solid ${color || '#9b59b6'}`,
        minWidth: isMobile ? 'calc(50% - 10px)' : 'auto',
        flex: isMobile ? '0 0 auto' : 1
      }}
    >
      <div style={{ fontSize: isMobile ? 20 : 24, marginBottom: 5 }}>{icon}</div>
      <div style={{ color: '#aaa', fontSize: isMobile ? 10 : 12 }}>{label}</div>
      {value !== undefined ? (
        <div style={{ color: color || '#9b59b6', fontSize: isMobile ? 18 : 28, fontWeight: 'bold' }}>{value}</div>
      ) : (
        button
      )}
    </div>
  )

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.8)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  }

  const modalPanelStyle = (accent) => ({
    background: '#1a1a3a',
    padding: isMobile ? 20 : 30,
    borderRadius: 10,
    maxWidth: 500,
    width: '90%',
    border: `2px solid ${accent}`,
    maxHeight: '90vh',
    overflowY: 'auto'
  })

  const inputStyle = (accent) => ({
    width: '100%',
    padding: 10,
    background: '#0a0a2a',
    color: 'white',
    border: `1px solid ${accent}`,
    borderRadius: 5
  })

  if (loading) {
    return (
      <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            width: '30px',
            height: '30px',
            border: '3px solid #9b59b6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        ></div>
        <p style={{ color: '#aaa', marginTop: 10 }}>Loading agent data...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, textAlign: 'center' }}>
        <p style={{ color: '#ff4444' }}>Error loading agent data: {error}</p>
        <button
          onClick={loadAgentData}
          style={{
            marginTop: 10,
            padding: '8px 16px',
            background: '#9b59b6',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
            color: 'white'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: '#1a1a3a', padding: isMobile ? 12 : 20, borderRadius: 10 }}>
      {/* SUB-TAB NAVIGATION */}
      <div style={{ display: 'flex', gap: 5, borderBottom: '1px solid #333', marginBottom: 20 }}>
        <button
          onClick={() => setAgentSubTab('codes')}
          style={{
            background: agentSubTab === 'codes' ? '#9b59b6' : 'transparent',
            color: agentSubTab === 'codes' ? 'white' : '#aaa',
            border: 'none',
            borderRadius: '5px 5px 0 0',
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: agentSubTab === 'codes' ? 'bold' : 'normal',
            fontSize: isMobile ? 12 : 14
          }}
        >
          🎫 My Codes
        </button>
        <button
          onClick={() => setAgentSubTab('tickets')}
          style={{
            background: agentSubTab === 'tickets' ? '#9b59b6' : 'transparent',
            color: agentSubTab === 'tickets' ? 'white' : '#aaa',
            border: 'none',
            borderRadius: '5px 5px 0 0',
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: agentSubTab === 'tickets' ? 'bold' : 'normal',
            fontSize: isMobile ? 12 : 14
          }}
        >
          🎟️ Raffle Tickets
        </button>
      </div>

      {/* ============================================================ */}
      {/* MY CODES SUB-TAB                                             */}
      {/* ============================================================ */}
      {agentSubTab === 'codes' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, justifyContent: isMobile ? 'center' : 'space-between' }}>
            <StatTile icon="🎫" label="Active Codes" value={activeCodes.length} color="#9b59b6" />
            <StatTile icon="✅" label="Codes Sold" value={soldCodes.length} color="#00ff88" />
            <StatTile icon="💰" label="Codes Earned" value={`$${codesCommissionUsd.toFixed(2)}`} color="#ffa502" />
            <StatTile
              icon="💸"
              label="Withdraw ALL"
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

          <div style={{ background: '#0a0a2a', padding: 15, borderRadius: 10, marginBottom: 20, border: '1px solid #9b59b6' }}>
            <p style={{ color: '#aaa', marginBottom: 5, fontSize: isMobile ? 10 : 12 }}>
              Your Agent ID (share with admin for code requests)
            </p>
            <code
              style={{
                display: 'block',
                background: '#1a1a3a',
                padding: 10,
                borderRadius: 5,
                color: '#9b59b6',
                textAlign: 'center',
                fontSize: isMobile ? 12 : 14,
                letterSpacing: 1,
                wordBreak: 'break-all'
              }}
            >
              {agentInfo?.agent_code || 'Not assigned'}
            </code>
          </div>

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
              <p style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>
                No codes assigned yet. Request codes from admin.
              </p>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 600 : 'auto' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #9b59b6' }}>
                      {['Code', 'Value', 'Status', 'Assigned', 'Expires', 'Actions'].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: h === 'Code' ? 'left' : 'center',
                            padding: 10,
                            color: '#9b59b6',
                            fontSize: isMobile ? 11 : 14
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agentCodes.map((code) => (
                      <tr key={code.id} style={{ borderBottom: '1px solid #333' }}>
                        <td
                          style={{
                            padding: 10,
                            fontFamily: 'monospace',
                            fontSize: isMobile ? 10 : 12,
                            color: '#00ff88',
                            wordBreak: 'break-all'
                          }}
                        >
                          {code.code}
                        </td>
                        <td style={{ padding: 10, textAlign: 'center', color: '#aaa', fontSize: isMobile ? 11 : 14 }}>
                          {code.points_value?.toLocaleString()} pts
                        </td>
                        <td style={{ padding: 10, textAlign: 'center' }}>{getStatusBadge(code.status, code.expires_at)}</td>
                        <td style={{ padding: 10, textAlign: 'center', color: '#aaa', fontSize: isMobile ? 11 : 14 }}>
                          {formatDate(code.assigned_at)}
                        </td>
                        <td style={{ padding: 10, textAlign: 'center', color: '#aaa', fontSize: isMobile ? 11 : 14 }}>
                          {formatDate(code.expires_at)}
                        </td>
                        <td style={{ padding: 10, textAlign: 'center' }}>
                          {code.status === 'active' &&
                            (!code.expires_at || new Date(code.expires_at) > new Date()) && (
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

          {/* Code Sales Summary */}
          <div style={{ background: '#0a0a2a', borderRadius: 10, padding: 15, border: '1px solid #333' }}>
            <h3 style={{ color: '#ffa502', margin: '0 0 15px 0', fontSize: isMobile ? 16 : 18 }}>
              💰 Code Sales Summary
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15 }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ color: '#aaa', fontSize: isMobile ? 11 : 13 }}>Total Codes Sold</div>
                <div style={{ color: '#00ff88', fontSize: isMobile ? 22 : 28, fontWeight: 'bold' }}>
                  {soldCodes.length}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ color: '#aaa', fontSize: isMobile ? 11 : 13 }}>Total Revenue</div>
                <div style={{ color: '#ffa502', fontSize: isMobile ? 22 : 28, fontWeight: 'bold' }}>
                  ${codesRevenueUsd.toFixed(2)}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ color: '#aaa', fontSize: isMobile ? 11 : 13 }}>Commission Earned</div>
                <div style={{ color: '#00ccff', fontSize: isMobile ? 22 : 28, fontWeight: 'bold' }}>
                  ${codesCommissionUsd.toFixed(2)}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ color: '#aaa', fontSize: isMobile ? 11 : 13 }}>Balance Due</div>
                <div style={{ color: '#9b59b6', fontSize: isMobile ? 22 : 28, fontWeight: 'bold' }}>
                  ${codesBalanceDueUsd.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, padding: 15, background: '#0a0a2a', borderRadius: 10, border: '1px solid #333' }}>
            <p style={{ color: '#888', fontSize: isMobile ? 10 : 12, margin: 0 }}>
              💡 <strong>How it works:</strong> Each code sells for $50 BBD (5,000 points).{' '}
              {agentInfo?.agent_tier === 'agent' &&
                ' You earn 5% commission on pre-paid codes or 2.5% on consignment codes.'}{' '}
              Share codes with customers. When they activate, you earn commission. Withdraw your commission balance to
              points or crypto.
            </p>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* RAFFLE TICKETS SUB-TAB                                       */}
      {/* ============================================================ */}
      {agentSubTab === 'tickets' && (
        <>
          {ticketsError && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid #ff4444', padding: 12, borderRadius: 8, marginBottom: 15 }}>
              <p style={{ color: '#ff4444', fontSize: 13, margin: 0 }}>❌ {ticketsError}</p>
              <button
                onClick={loadRaffleData}
                style={{ marginTop: 8, padding: '6px 12px', background: '#ff4444', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', fontSize: 12 }}
              >
                Retry
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, justifyContent: isMobile ? 'center' : 'space-between' }}>
            <StatTile icon="🎟️" label="Active Tickets" value={activeTickets.length} color="#9b59b6" />
            <StatTile icon="✅" label="Sold Tickets" value={redeemedTickets.length} color="#00ff88" />
            <StatTile icon="💰" label="Raffle Earned" value={`$${ticketsCommissionUsd.toFixed(2)}`} color="#ffa502" />
            <StatTile
              icon="💸"
              label="Withdraw ALL"
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

          {/* Available Raffles */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ color: '#9b59b6', margin: '0 0 15px 0', fontSize: isMobile ? 16 : 18 }}>
              🎲 Available Raffles
            </h3>
            {ticketsLoading ? (
              <p style={{ textAlign: 'center', color: '#aaa', padding: 20 }}>Loading raffles...</p>
            ) : availableRaffles.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#aaa', padding: 20 }}>
                No raffles available for distribution right now.
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                  gap: 15
                }}
              >
                {availableRaffles.map((raffle) => (
                  <div
                    key={raffle.id}
                    style={{
                      background: '#0a0a2a',
                      border: '1px solid #9b59b6',
                      borderRadius: 10,
                      padding: 15
                    }}
                  >
                    <h4 style={{ color: 'white', margin: '0 0 10px 0', fontSize: isMobile ? 14 : 16 }}>
                      {raffle.title}
                    </h4>
                    <p style={{ color: '#aaa', fontSize: isMobile ? 11 : 13, margin: '4px 0' }}>
                      🏆 Prize: <span style={{ color: '#00ccff' }}>{raffle.prize_description}</span>
                    </p>
                    <p style={{ color: '#aaa', fontSize: isMobile ? 11 : 13, margin: '4px 0' }}>
                      💰 Ticket Price: <span style={{ color: '#ffa502' }}>{formatUsd(raffle.agent_ticket_price_points)} USD</span>
                    </p>
                    <p style={{ color: '#aaa', fontSize: isMobile ? 11 : 13, margin: '4px 0' }}>
                      💵 Your Commission: <span style={{ color: '#00ff88' }}>{formatUsd(raffle.agent_commission_points)} per ticket</span>
                    </p>
                    <p style={{ color: '#aaa', fontSize: isMobile ? 11 : 13, margin: '4px 0' }}>
                      📅 Ends: <span>{formatDate(raffle.end_date)}</span>
                    </p>
                    <p style={{ color: '#aaa', fontSize: isMobile ? 11 : 13, margin: '4px 0 12px 0' }}>
                      🎟️ Max per request: <span style={{ color: '#9b59b6' }}>{raffle.max_tickets_per_agent} tickets</span>
                    </p>
                    {pendingRequestRaffleIds.has(raffle.id) ? (
                        <button
                          disabled
                          style={{
                            background: '#555',
                            color: '#888',
                            border: 'none',
                            borderRadius: 5,
                            padding: '8px 16px',
                            cursor: 'not-allowed',
                            fontWeight: 'bold',
                            width: '100%',
                            fontSize: isMobile ? 12 : 14
                          }}
                        >
                          ⏳ Request Pending
                        </button>
                      ) : (
                        <button
                          onClick={() => openRequestTicketModal(raffle)}
                          style={{
                            background: '#9b59b6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 5,
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            width: '100%',
                            fontSize: isMobile ? 12 : 14
                          }}
                        >
                          🎟️ Request Tickets
                        </button>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Tickets */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ color: '#9b59b6', margin: '0 0 15px 0', fontSize: isMobile ? 16 : 18 }}>📦 My Tickets</h3>

            <div style={{ display: 'flex', gap: 10, marginBottom: 15, flexDirection: isMobile ? 'column' : 'row' }}>
              <select
                value={ticketFilter}
                onChange={(e) => setTicketFilter(e.target.value)}
                style={{
                  padding: 8,
                  background: '#0a0a2a',
                  color: 'white',
                  border: '1px solid #9b59b6',
                  borderRadius: 5,
                  fontSize: isMobile ? 12 : 14
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="redeemed">Redeemed</option>
                <option value="expired">Expired</option>
              </select>
              <input
                type="text"
                placeholder="Search by code or raffle..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                style={{
                  flex: 1,
                  padding: 8,
                  background: '#0a0a2a',
                  color: 'white',
                  border: '1px solid #9b59b6',
                  borderRadius: 5,
                  fontSize: isMobile ? 12 : 14
                }}
              />
            </div>

            {ticketsLoading ? (
              <p style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Loading tickets...</p>
            ) : filteredTickets.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>
                {myTickets.length === 0
                  ? 'No tickets yet. Request tickets from the available raffles above.'
                  : 'No tickets match your filters.'}
              </p>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 700 : 'auto' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #9b59b6' }}>
                      {['Ticket Code', 'Raffle', 'Status', 'Buyer', 'Redeemed', 'Actions'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: 10,
                            textAlign: h === 'Ticket Code' ? 'left' : 'center',
                            color: '#9b59b6',
                            fontSize: isMobile ? 11 : 14
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((t) => {
                      const raffle = raffleLookup[t.promotion_id]
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid #333' }}>
                          <td
                            style={{
                              padding: 10,
                              fontFamily: 'monospace',
                              fontSize: isMobile ? 10 : 12,
                              color: '#00ff88',
                              wordBreak: 'break-all'
                            }}
                          >
                            {t.ticket_code}
                          </td>
                          <td style={{ padding: 10, textAlign: 'center', color: '#aaa', fontSize: isMobile ? 11 : 13 }}>
                            {raffle?.title || '—'}
                          </td>
                          <td style={{ padding: 10, textAlign: 'center' }}>{getTicketStatusBadge(t.status)}</td>
                          <td style={{ padding: 10, textAlign: 'center', color: '#aaa', fontSize: isMobile ? 11 : 13 }}>
                            {t.buyer_alias || t.buyer_email || '—'}
                          </td>
                          <td style={{ padding: 10, textAlign: 'center', color: '#aaa', fontSize: isMobile ? 11 : 13 }}>
                            {t.redeemed_at ? formatDate(t.redeemed_at) : '—'}
                          </td>
                          <td style={{ padding: 10, textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                              {t.status === 'active' && (
                                <>
                                  <button
                                    onClick={() => openWhatsAppLink(t)}
                                    title="Open WhatsApp with pre-filled message"
                                    style={{
                                      background: '#25D366',
                                      border: 'none',
                                      borderRadius: 4,
                                      padding: isMobile ? '3px 6px' : '4px 8px',
                                      cursor: 'pointer',
                                      fontSize: isMobile ? 10 : 11,
                                      color: 'white',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    📱 WhatsApp
                                  </button>
                                  <button
                                    onClick={() => openQrModal(t)}
                                    title="Show QR code"
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
                                    📷 QR
                                  </button>
                                  <button
                                    onClick={() => copyRedemptionLink(t.ticket_code)}
                                    title="Copy redemption link"
                                    style={{
                                      background: '#9b59b6',
                                      border: 'none',
                                      borderRadius: 4,
                                      padding: isMobile ? '3px 6px' : '4px 8px',
                                      cursor: 'pointer',
                                      fontSize: isMobile ? 10 : 11,
                                      color: 'white',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    🔗 Link
                                  </button>
                                  <button
                                    onClick={() => copyCode(t.ticket_code)}
                                    title="Copy raw code"
                                    style={{
                                      background: '#555',
                                      border: 'none',
                                      borderRadius: 4,
                                      padding: isMobile ? '3px 6px' : '4px 8px',
                                      cursor: 'pointer',
                                      fontSize: isMobile ? 10 : 11,
                                      color: 'white',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    📋 Code
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => openTicketDetail(t)}
                                style={{
                                  background: '#333',
                                  border: 'none',
                                  borderRadius: 4,
                                  padding: isMobile ? '3px 6px' : '4px 8px',
                                  cursor: 'pointer',
                                  fontSize: isMobile ? 10 : 11,
                                  color: 'white',
                                  fontWeight: 'bold'
                                }}
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Ticket Sales Summary */}
          <div style={{ background: '#0a0a2a', borderRadius: 10, padding: 15, border: '1px solid #333' }}>
            <h3 style={{ color: '#ffa502', margin: '0 0 15px 0', fontSize: isMobile ? 16 : 18 }}>
              💰 Ticket Sales Summary
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15 }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ color: '#aaa', fontSize: isMobile ? 11 : 13 }}>Total Tickets Sold</div>
                <div style={{ color: '#00ff88', fontSize: isMobile ? 22 : 28, fontWeight: 'bold' }}>
                  {redeemedTickets.length}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ color: '#aaa', fontSize: isMobile ? 11 : 13 }}>Total Revenue</div>
                <div style={{ color: '#ffa502', fontSize: isMobile ? 22 : 28, fontWeight: 'bold' }}>
                  ${ticketsRevenueUsd.toFixed(2)}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ color: '#aaa', fontSize: isMobile ? 11 : 13 }}>Commission Earned</div>
                <div style={{ color: '#00ccff', fontSize: isMobile ? 22 : 28, fontWeight: 'bold' }}>
                  ${ticketsCommissionUsd.toFixed(2)}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ color: '#aaa', fontSize: isMobile ? 11 : 13 }}>Balance Due</div>
                <div style={{ color: '#9b59b6', fontSize: isMobile ? 22 : 28, fontWeight: 'bold' }}>
                  ${ticketsBalanceDueUsd.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* REQUEST CODES MODAL                                          */}
      {/* ============================================================ */}
      {showRequestModal && (
        <div style={modalOverlayStyle}>
          <div style={modalPanelStyle('#9b59b6')}>
            <h2 style={{ color: '#9b59b6', marginBottom: 20, fontSize: isMobile ? 20 : 24 }}>Request More Codes</h2>

            <div style={{ marginBottom: 15 }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: 5, fontSize: isMobile ? 12 : 14 }}>
                Quantity (1-50 codes)
              </label>
              <input
                type="number"
                value={requestQuantity}
                onChange={(e) => setRequestQuantity(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                min="1"
                max="50"
                style={inputStyle('#9b59b6')}
              />
              <p style={{ color: '#666', fontSize: 11, marginTop: 5 }}>You will be notified when admin approves</p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: 5, fontSize: isMobile ? 12 : 14 }}>
                Purchase Tier
              </label>
              <select value={requestTier} onChange={(e) => setRequestTier(e.target.value)} style={inputStyle('#9b59b6')}>
                <option value="consignment">Consignment (2.5% commission, pay after sale)</option>
                <option value="prepaid">Pre-paid (5% commission, pay upfront)</option>
              </select>
            </div>

            <div style={{ background: '#0a0a2a', padding: 15, borderRadius: 10, marginBottom: 20 }}>
              <p style={{ color: '#aaa', marginBottom: 5, fontSize: isMobile ? 12 : 14 }}>Summary:</p>
              <p style={{ color: '#00ff88', fontSize: isMobile ? 14 : 16 }}>Codes requested: {requestQuantity}</p>
              <p style={{ color: '#ffa502', fontSize: isMobile ? 14 : 16 }}>
                Total Value: ${(requestQuantity * 50).toLocaleString()} BBD
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
              <button
                onClick={requestMoreCodes}
                disabled={requestLoading}
                style={{
                  padding: 12,
                  background: '#9b59b6',
                  border: 'none',
                  borderRadius: 5,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: 'white',
                  flex: 1
                }}
              >
                {requestLoading ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                onClick={() => {
                  setShowRequestModal(false)
                  setRequestQuantity(10)
                }}
                style={{ padding: 12, background: '#333', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* WITHDRAWAL MODAL                                             */}
      {/* ============================================================ */}
      {showWithdrawModal && (
        <div style={modalOverlayStyle}>
          <div style={modalPanelStyle('#ffa502')}>
            <h2 style={{ color: '#ffa502', marginBottom: 20, fontSize: isMobile ? 20 : 24 }}>💸 Withdraw Commission</h2>

            <div style={{ marginBottom: 15, background: '#0a0a2a', padding: 15, borderRadius: 10, textAlign: 'center' }}>
              <span style={{ color: '#aaa', fontSize: isMobile ? 12 : 14 }}>Available Balance (ALL sources)</span>
              <div style={{ color: '#00ff88', fontSize: isMobile ? 28 : 32, fontWeight: 'bold' }}>
                ${(agentInfo?.agent_commission_balance || 0).toFixed(2)}
              </div>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: 5, fontSize: isMobile ? 12 : 14 }}>
                Amount ($USD)
              </label>
              <input
                type="number"
                step="1"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Min $10"
                style={inputStyle('#ffa502')}
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: 5, fontSize: isMobile ? 12 : 14 }}>
                Withdrawal Method
              </label>
              <select value={withdrawMethod} onChange={(e) => setWithdrawMethod(e.target.value)} style={inputStyle('#ffa502')}>
                <option value="points">Convert to Points (1 USD = 200 pts)</option>
                <option value="crypto">Crypto Wallet (USDT)</option>
              </select>
            </div>

            {withdrawMethod === 'crypto' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ color: '#aaa', display: 'block', marginBottom: 5, fontSize: isMobile ? 12 : 14 }}>
                  Wallet Address (TRC20)
                </label>
                <input
                  type="text"
                  value={withdrawWallet}
                  onChange={(e) => setWithdrawWallet(e.target.value)}
                  placeholder="Enter your USDT wallet address"
                  style={inputStyle('#ffa502')}
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
              <button
                onClick={requestWithdrawal}
                disabled={withdrawLoading}
                style={{
                  padding: 12,
                  background: '#ffa502',
                  border: 'none',
                  borderRadius: 5,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  color: '#0a0a2a',
                  flex: 1
                }}
              >
                {withdrawLoading ? 'Processing...' : 'Request Withdrawal'}
              </button>
              <button
                onClick={() => {
                  setShowWithdrawModal(false)
                  setWithdrawAmount('')
                  setWithdrawWallet('')
                }}
                style={{ padding: 12, background: '#333', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* REQUEST TICKETS MODAL                                        */}
      {/* ============================================================ */}
      {showRequestTicketModal && selectedRaffle && (
        <div style={modalOverlayStyle}>
          <div style={modalPanelStyle('#9b59b6')}>
            <h2 style={{ color: '#9b59b6', marginBottom: 20, fontSize: isMobile ? 20 : 24 }}>
              🎟️ Request Raffle Tickets
            </h2>

            <div style={{ marginBottom: 15 }}>
              <p style={{ color: 'white', fontSize: isMobile ? 13 : 15, margin: '0 0 4px 0' }}>
                <strong>Raffle:</strong> {selectedRaffle.title}
              </p>
              <p style={{ color: '#aaa', fontSize: isMobile ? 12 : 14, margin: 0 }}>
                <strong>Prize:</strong> {selectedRaffle.prize_description}
              </p>
            </div>

            <div style={{ background: '#0a0a2a', padding: 15, borderRadius: 10, marginBottom: 15 }}>
              <p style={{ color: '#aaa', fontSize: isMobile ? 12 : 14, margin: '4px 0' }}>
                Ticket Price (your cost): <span style={{ color: '#ffa502' }}>{formatUsd(selectedRaffle.agent_ticket_price_points)} USD</span>
              </p>
              <p style={{ color: '#aaa', fontSize: isMobile ? 12 : 14, margin: '4px 0' }}>
                Your Commission: <span style={{ color: '#00ff88' }}>{formatUsd(selectedRaffle.agent_commission_points)} per ticket</span>
              </p>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: 5, fontSize: isMobile ? 12 : 14 }}>
                Number of Tickets (1–{selectedRaffle.max_tickets_per_agent})
              </label>
              <input
                type="number"
                min={1}
                max={selectedRaffle.max_tickets_per_agent}
                value={ticketRequestQuantity}
                onChange={(e) =>
                  setTicketRequestQuantity(
                    Math.min(selectedRaffle.max_tickets_per_agent, Math.max(1, parseInt(e.target.value) || 1))
                  )
                }
                style={inputStyle('#9b59b6')}
              />
            </div>

            <div style={{ background: '#0a0a2a', padding: 15, borderRadius: 10, marginBottom: 15 }}>
              <p style={{ color: '#aaa', marginBottom: 5, fontSize: isMobile ? 12 : 14 }}>Summary:</p>
              <p style={{ color: '#00ff88', fontSize: isMobile ? 14 : 16, margin: '2px 0' }}>
                Tickets: {ticketRequestQuantity}
              </p>
              <p style={{ color: '#ffa502', fontSize: isMobile ? 14 : 16, margin: '2px 0' }}>
                Total Cost: {formatUsd(ticketRequestQuantity * selectedRaffle.agent_ticket_price_points)} USD
              </p>
              <p style={{ color: '#00ccff', fontSize: isMobile ? 14 : 16, margin: '2px 0' }}>
                Potential Commission: {formatUsd(ticketRequestQuantity * selectedRaffle.agent_commission_points)}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
              <button
                onClick={submitTicketRequest}
                disabled={requestTicketLoading}
                style={{
                  padding: 12,
                  background: requestTicketLoading ? '#555' : '#9b59b6',
                  border: 'none',
                  borderRadius: 5,
                  fontWeight: 'bold',
                  cursor: requestTicketLoading ? 'not-allowed' : 'pointer',
                  color: 'white',
                  flex: 1
                }}
              >
                {requestTicketLoading ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                onClick={() => setShowRequestTicketModal(false)}
                disabled={requestTicketLoading}
                style={{ padding: 12, background: '#333', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TICKET DETAIL MODAL                                          */}
      {/* ============================================================ */}
      {showTicketDetailModal && selectedTicket && (
        <div style={modalOverlayStyle}>
          <div style={modalPanelStyle('#00ccff')}>
            <h2 style={{ color: '#00ccff', marginBottom: 20, fontSize: isMobile ? 20 : 24 }}>🎟️ Ticket Details</h2>

            <div style={{ marginBottom: 15 }}>
              <p style={{ color: '#aaa', fontSize: isMobile ? 12 : 14, margin: '4px 0' }}>
                <strong>Code:</strong> <span style={{ color: '#00ff88', fontFamily: 'monospace' }}>{selectedTicket.ticket_code}</span>
              </p>
              <p style={{ color: '#aaa', fontSize: isMobile ? 12 : 14, margin: '4px 0' }}>
                <strong>Raffle:</strong> {raffleLookup[selectedTicket.promotion_id]?.title || '—'}
              </p>
              <p style={{ color: '#aaa', fontSize: isMobile ? 12 : 14, margin: '4px 0' }}>
                <strong>Status:</strong> {getTicketStatusBadge(selectedTicket.status)}
              </p>
            </div>

            <div style={{ background: '#0a0a2a', padding: 15, borderRadius: 10, marginBottom: 15 }}>
              <p style={{ color: '#00ccff', fontSize: isMobile ? 13 : 14, margin: '0 0 8px 0' }}>
                <strong>Redemption Details</strong>
              </p>
              <p style={{ color: '#aaa', fontSize: isMobile ? 12 : 14, margin: '4px 0' }}>
                Buyer: {selectedTicket.buyer_name || selectedTicket.buyer_email || 'Not yet redeemed'}
              </p>
              <p style={{ color: '#aaa', fontSize: isMobile ? 12 : 14, margin: '4px 0' }}>
                Public Alias: {selectedTicket.buyer_alias || '—'}
              </p>
              <p style={{ color: '#aaa', fontSize: isMobile ? 12 : 14, margin: '4px 0' }}>
                Redeemed At: {selectedTicket.redeemed_at ? formatDate(selectedTicket.redeemed_at) : '—'}
              </p>
              <p style={{ color: '#aaa', fontSize: isMobile ? 12 : 14, margin: '4px 0' }}>
                Ticket Price: {formatUsd(selectedTicket.price_points)}
              </p>
              <p style={{ color: '#aaa', fontSize: isMobile ? 12 : 14, margin: '4px 0' }}>
                Your Commission: {formatUsd(selectedTicket.commission_points)}
              </p>
            </div>

            {selectedTicket.status === 'active' && (
              <div style={{ display: 'flex', gap: 10, flexDirection: 'column', marginBottom: 15 }}>
                <button
                  onClick={() => {
                    setShowTicketDetailModal(false)
                    openWhatsAppLink(selectedTicket)
                  }}
                  style={{ padding: 10, background: '#25D366', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer', color: 'white' }}
                >
                  📱 Send via WhatsApp
                </button>
                <button
                  onClick={() => {
                    setShowTicketDetailModal(false)
                    openQrModal(selectedTicket)
                  }}
                  style={{ padding: 10, background: '#00ccff', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer', color: '#0a0a2a' }}
                >
                  📷 Show QR Code
                </button>
                <button
                  onClick={() => copyRedemptionLink(selectedTicket.ticket_code)}
                  style={{ padding: 10, background: '#9b59b6', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer', color: 'white' }}
                >
                  🔗 Copy Redemption Link
                </button>
                <button
                  onClick={() => copyCode(selectedTicket.ticket_code)}
                  style={{ padding: 10, background: '#555', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer', color: 'white' }}
                >
                  📋 Copy Code
                </button>
              </div>
            )}

            <button
              onClick={() => setShowTicketDetailModal(false)}
              style={{ padding: 12, background: '#333', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', width: '100%' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* QR CODE MODAL                                                */}
      {/* ============================================================ */}
      {showQrModal && selectedTicket && (
        <div style={modalOverlayStyle}>
          <div style={modalPanelStyle('#00ccff')}>
            <h2 style={{ color: '#00ccff', marginBottom: 10, fontSize: isMobile ? 20 : 24 }}>
              📷 Ticket QR Code
            </h2>
            <p style={{ color: '#aaa', fontSize: isMobile ? 12 : 14, marginBottom: 5 }}>
              {raffleLookup[selectedTicket.promotion_id]?.title || 'Raffle Ticket'}
            </p>
            <p style={{ color: '#00ff88', fontFamily: 'monospace', fontSize: isMobile ? 12 : 14, marginBottom: 15 }}>
              {selectedTicket.ticket_code}
            </p>

            <div
              style={{
                background: 'white',
                borderRadius: 10,
                padding: 15,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 250,
                marginBottom: 15
              }}
            >
              {qrGenerating ? (
                <p style={{ color: '#0a0a2a' }}>Generating QR...</p>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR for ${selectedTicket.ticket_code}`}
                  style={{ width: '100%', maxWidth: 280, height: 'auto' }}
                />
              ) : (
                <p style={{ color: '#0a0a2a' }}>Could not generate QR</p>
              )}
            </div>

            <p style={{ color: '#aaa', fontSize: isMobile ? 11 : 12, textAlign: 'center', marginBottom: 15 }}>
              Buyer scans with their phone camera to open the redemption page.
            </p>

            <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
              <button
                onClick={downloadQr}
                disabled={!qrDataUrl}
                style={{
                  padding: 10,
                  background: '#00ccff',
                  border: 'none',
                  borderRadius: 5,
                  fontWeight: 'bold',
                  cursor: qrDataUrl ? 'pointer' : 'not-allowed',
                  color: '#0a0a2a',
                  opacity: qrDataUrl ? 1 : 0.5
                }}
              >
                ⬇️ Download QR
              </button>
              <button
                onClick={() => {
                  setShowQrModal(false)
                  openWhatsAppLink(selectedTicket)
                }}
                style={{ padding: 10, background: '#25D366', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer', color: 'white' }}
              >
                📱 Send via WhatsApp instead
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                style={{ padding: 10, background: '#333', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AgentTab