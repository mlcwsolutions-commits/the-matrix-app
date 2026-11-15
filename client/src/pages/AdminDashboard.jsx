// client/src/pages/AdminDashboard.jsx
// THE MATRIX V5.3 - Complete Admin Dashboard
// UPDATED (Phase C): Added Bonus Pool Settings section (overhead % + days-to-drain)

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const localToUTC = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toISOString()
}

const UTCToLocal = (utcString) => {
  if (!utcString) return ''
  const date = new Date(utcString)
  return date.toLocaleString()
}

function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [matrices, setMatrices] = useState([])
  const [transactions, setTransactions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDescription, setTransferDescription] = useState('')
  const [transferFrom, setTransferFrom] = useState('admin_fees')
  const [transferLoading, setTransferLoading] = useState(false)
  
  const [pendingPayments, setPendingPayments] = useState([])
  const [pendingCashouts, setPendingCashouts] = useState([])
  const [paymentNotes, setPaymentNotes] = useState({})
  const [cashoutNotes, setCashoutNotes] = useState({})
  const [txHash, setTxHash] = useState({})
  
  const [selectedMatrixId, setSelectedMatrixId] = useState(null)
  const [matrixDetails, setMatrixDetails] = useState(null)
  const [matrixTreeData, setMatrixTreeData] = useState(null)
  const [expandedLevels, setExpandedLevels] = useState(new Set())
  const [expandedAll, setExpandedAll] = useState(false)
  
  const [searchPosition, setSearchPosition] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedSpotDetails, setSelectedSpotDetails] = useState(null)
  const [showSpotModal, setShowSpotModal] = useState(false)
  
  const [allNotifications, setAllNotifications] = useState([])
  const [notificationStats, setNotificationStats] = useState({ total: 0, unread: 0, system: 0, user: 0 })
  const [notificationFilter, setNotificationFilter] = useState('all')
  const [systemNotificationTitle, setSystemNotificationTitle] = useState('')
  const [systemNotificationMessage, setSystemNotificationMessage] = useState('')
  const [sendToAllUsers, setSendToAllUsers] = useState('all_users')
  const [notificationSending, setNotificationSending] = useState(false)

  const [completionRules, setCompletionRules] = useState([])
  const [completionLog, setCompletionLog] = useState([])
  const [ruleTestResult, setRuleTestResult] = useState(null)
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false)
  const [newRule, setNewRule] = useState({
    rule_type: 'spots',
    rule_name: '',
    threshold_value: 0,
    comparison_operator: '>=',
    priority: 50,
    description: ''
  })

  const [agentSubTab, setAgentSubTab] = useState('agents_list')
  const [agentWithdrawals, setAgentWithdrawals] = useState([])
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState(0)

  const [promotions, setPromotions] = useState([])
  const [showCreatePromotionModal, setShowCreatePromotionModal] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState(null)
  const [newPromotion, setNewPromotion] = useState({
    title: '',
    description: '',
    prize_description: '',
    prize_points: 0,
    entry_cost: 500,
    start_date: '',
    end_date: '',
    max_entries_per_user: 1,
    is_active: true,
    auto_draw: true,
    allow_non_member_entry: false,
    max_tickets_per_agent: 50
  })

  // Raffle ticket distribution state
  const [raffleTicketRequests, setRaffleTicketRequests] = useState([])
  const [pendingRaffleRequestsCount, setPendingRaffleRequestsCount] = useState(0)
  const [showGenerateTicketsModal, setShowGenerateTicketsModal] = useState(false)
  const [generateTicketsRaffle, setGenerateTicketsRaffle] = useState(null)
  const [generateTicketsQuantity, setGenerateTicketsQuantity] = useState(50)
  const [generateTicketsLoading, setGenerateTicketsLoading] = useState(false)
  const [processingRaffleRequest, setProcessingRaffleRequest] = useState(null)

  const [agents, setAgents] = useState([])
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [selectedAgentUser, setSelectedAgentUser] = useState(null)
  const [agentCodeQuantity, setAgentCodeQuantity] = useState(10)
  const [agentPurchaseTier, setAgentPurchaseTier] = useState('consignment')
  
  const [agentRequests, setAgentRequests] = useState([])
  const [showRequestsModal, setShowRequestsModal] = useState(false)
  const [processingRequest, setProcessingRequest] = useState(null)
  
  const [cryptoWallets, setCryptoWallets] = useState([])

  // ============================================
  // BONUS POOL SETTINGS (Phase C — NEW)
  // ============================================
  const [bonusOverheadPercent, setBonusOverheadPercent] = useState(5)
  const [bonusDaysToDrain, setBonusDaysToDrain] = useState(30)
  const [bonusPoolBalance, setBonusPoolBalance] = useState(0)
  const [activeUserCount, setActiveUserCount] = useState(0)
  const [bonusSettingsSaving, setBonusSettingsSaving] = useState(false)
  const [bonusSettingsMessage, setBonusSettingsMessage] = useState(null)
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    spotsFilled: 0,
    recoveryFund: 0,
    adminFees: 0,
    currentMatrixNumber: 1,
    completedMatrices: 0,
    percentFull: 0,
    totalPointsIssued: 0,
    totalCommissionsPaid: 0,
    maxLevel: 0,
    totalAgents: 0
  })

  const ADMIN_API_URL = `${SUPABASE_URL}/functions/v1/admin-stats`
  const TRANSFER_API_URL = `${SUPABASE_URL}/functions/v1/transfer-points-admin`
  const DISABLE_USER_URL = `${SUPABASE_URL}/functions/v1/disable-user`
  const COMPLETE_MATRIX_URL = `${SUPABASE_URL}/functions/v1/complete-matrix`
  const APPROVE_PAYMENT_URL = `${SUPABASE_URL}/functions/v1/admin-approve-payment`
  const REJECT_PAYMENT_URL = `${SUPABASE_URL}/functions/v1/admin-reject-payment`
  const APPROVE_CASHOUT_URL = `${SUPABASE_URL}/functions/v1/admin-approve-cashout`
  const REJECT_CASHOUT_URL = `${SUPABASE_URL}/functions/v1/admin-reject-cashout`
  const CREATE_PAYOUT_URL = `${SUPABASE_URL}/functions/v1/create-nowpayments-payout`
  const ADMIN_GET_NOTIFICATIONS_URL = `${SUPABASE_URL}/functions/v1/admin-get-notifications`
  const SEND_SYSTEM_NOTIFICATION_URL = `${SUPABASE_URL}/functions/v1/send-system-notification`
  const MANAGE_RULES_URL = `${SUPABASE_URL}/functions/v1/manage-completion-rules`
  const BONUS_ENGINE_URL = `${SUPABASE_URL}/functions/v1/bonus-engine`

  const formatNumber = (num) => num?.toLocaleString() || '0'
  
  const formatDateForInput = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().slice(0, 16)
  }

  // ============================================
  // NOTIFICATION TYPE BADGE COMPONENT
  // ============================================
  const getNotificationBadge = (type) => {
    const badges = {
      system_announcement: { label: 'SYS', color: '#00ff88' },
      level_complete: { label: 'SYS', color: '#00ff88' },
      bonus_earned: { label: 'SYS', color: '#00ff88' },
      quick_start_bonus: { label: 'SYS', color: '#00ff88' },
      promotion_available: { label: 'PRM', color: '#ffa502' },
      raffle_winner: { label: 'PRM', color: '#ffa502' },
      raffle_winner_announcement: { label: 'PRM', color: '#ffa502' },
      raffle_ended: { label: 'PRM', color: '#ffa502' },
      raffle_entry_confirmed: { label: 'PRM', color: '#ffa502' },
      raffle_expired_no_winner: { label: 'PRM', color: '#ffa502' },
      agent_code_request: { label: 'AGT', color: '#9b59b6' },
      agent_commission: { label: 'AGT', color: '#9b59b6' },
      agent_withdrawal_approved: { label: 'AGT', color: '#9b59b6' },
      agent_withdrawal_rejected: { label: 'AGT', color: '#9b59b6' },
      cashout_approved: { label: 'USR', color: '#00ccff' },
      cashout_rejected: { label: 'USR', color: '#00ccff' },
      payment_approved: { label: 'USR', color: '#00ccff' },
      payment_rejected: { label: 'USR', color: '#00ccff' },
      referral_joined: { label: 'USR', color: '#00ccff' },
      bonus_paid: { label: 'BON', color: '#00ff88' }
    }
    return badges[type] || { label: 'USR', color: '#888' }
  }

  const calculateSlot = (position) => {
    return ((position - 2) % 4) + 1
  }

  const getChildPositions = (parentPosition) => {
    return [
      parentPosition * 4 + 1 - 3,
      parentPosition * 4 + 2 - 3,
      parentPosition * 4 + 3 - 3,
      parentPosition * 4 + 4 - 3
    ]
  }

  const getSpotStatus = (spot) => {
    if (!spot) return 'empty'
    if (spot.filled_at !== null) {
      if (spot.is_auto_entry) return 'auto_entry'
      if (spot.level > 0 && spot.user_id) return 'filled'
      return 'filled'
    }
    if (spot.reserved_until && new Date(spot.reserved_until) > new Date()) return 'reserved'
    if (spot.pending_signup_id !== null) return 'pending'
    return 'empty'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'filled': return '#00ff88'
      case 'auto_entry': return '#00ccff'
      case 'reserved': return '#ffa502'
      case 'pending': return '#ffcc00'
      default: return 'rgba(255,255,255,0.1)'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'filled': return 'Filled'
      case 'auto_entry': return 'Auto-Entry'
      case 'reserved': return 'Reserved'
      case 'pending': return 'Pending'
      default: return 'Empty'
    }
  }

  const getUserState = (u) => {
    if (u.disabled === true) return 'disabled'
    if (u.account_status === 'frozen') return 'frozen'
    return 'enabled'
  }

  // ============================================
  // CRYPTO WALLET MANAGEMENT FUNCTIONS
  // ============================================

  const fetchCryptoWallets = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-get-crypto-wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      
      const result = await response.json()
      
      if (!result.success) throw new Error(result.error)
      
      setCryptoWallets(result.wallets || [])
    } catch (error) {
      console.error('Error fetching crypto wallets:', error)
      setCryptoWallets([])
    }
  }

  const updateWalletAddress = async (id, address) => {
    const { error } = await supabase
      .from('crypto_wallets')
      .update({ address })
      .eq('id', id)
    
    if (error) {
      console.error('Error updating wallet:', error)
      alert('Error updating wallet address')
      return
    }
    
    fetchCryptoWallets()
  }

  const updateWalletLabel = async (id, label) => {
    const { error } = await supabase
      .from('crypto_wallets')
      .update({ label })
      .eq('id', id)
    
    if (error) {
      console.error('Error updating wallet label:', error)
      return
    }
    
    fetchCryptoWallets()
  }

  const toggleWalletActive = async (id, is_active) => {
    const { error } = await supabase
      .from('crypto_wallets')
      .update({ is_active })
      .eq('id', id)
    
    if (error) {
      console.error('Error toggling wallet:', error)
      return
    }
    
    fetchCryptoWallets()
  }

  const addWallet = async () => {
    const newOrder = cryptoWallets.length + 1
    
    const { error } = await supabase
      .from('crypto_wallets')
      .insert({
        address: 'Enter wallet address',
        label: `Wallet ${newOrder}`,
        network: 'TRC20',
        display_order: newOrder,
        is_active: false
      })
    
    if (error) {
      console.error('Error adding wallet:', error)
      alert('Error adding wallet: ' + error.message)
      return
    }
    
    alert('✅ Wallet added successfully! Click Refresh to see it.')
    fetchCryptoWallets()
  }

  const deleteWallet = async (id) => {
    if (!confirm('Delete this wallet address?')) return
    
    const { error } = await supabase
      .from('crypto_wallets')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting wallet:', error)
      alert('Error deleting wallet')
      return
    }
    
    fetchCryptoWallets()
  }

  // ============================================
  // BONUS POOL SETTINGS (Phase C — NEW)
  // ============================================

  const loadBonusSettings = async () => {
    try {
      const { data: settings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['bonus_overhead_percent', 'bonus_days_to_drain'])

      if (settings) {
        const overhead = settings.find((s) => s.key === 'bonus_overhead_percent')
        const days = settings.find((s) => s.key === 'bonus_days_to_drain')
        if (overhead) setBonusOverheadPercent(parseFloat(overhead.value) || 5)
        if (days) setBonusDaysToDrain(parseInt(days.value) || 30)
      }

      const { data: pool } = await supabase
        .from('bonus_pool')
        .select('balance_points')
        .eq('id', 1)
        .single()
      if (pool) setBonusPoolBalance(pool.balance_points || 0)

      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('account_status', 'active')
      setActiveUserCount(count || 0)
    } catch (err) {
      console.error('Error loading bonus settings:', err)
    }
  }

  const saveBonusSettings = async () => {
    if (bonusOverheadPercent < 0 || bonusOverheadPercent > 100) {
      alert('Overhead % must be between 0 and 100')
      return
    }
    if (bonusDaysToDrain < 1 || bonusDaysToDrain > 365) {
      alert('Days to Drain must be between 1 and 365')
      return
    }
    if (!Number.isInteger(bonusDaysToDrain)) {
      alert('Days to Drain must be a whole number')
      return
    }

    setBonusSettingsSaving(true)
    setBonusSettingsMessage(null)

    try {
      const updates = [
        { key: 'bonus_overhead_percent', value: String(bonusOverheadPercent) },
        { key: 'bonus_days_to_drain', value: String(bonusDaysToDrain) }
      ]

      for (const u of updates) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(
            { key: u.key, value: u.value, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          )
        if (error) throw error
      }

      setBonusSettingsMessage({ type: 'success', text: '✅ Bonus Pool settings saved' })
      setTimeout(() => setBonusSettingsMessage(null), 3000)
    } catch (err) {
      console.error('Error saving bonus settings:', err)
      setBonusSettingsMessage({ type: 'error', text: '❌ ' + err.message })
    } finally {
      setBonusSettingsSaving(false)
    }
  }
  
  // ============================================
  // LOAD DATA FUNCTIONS
  // ============================================

  const loadAdminData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(ADMIN_API_URL, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const result = await response.json()

      if (result.success) {
        setUsers(result.users || [])
        setFilteredUsers((result.users || []).slice(0, 50))
        setMatrices(result.matrices || [])
        setTransactions(result.transactions || [])
        
        const activeMatrix = result.matrices?.find(m => m.is_active)
        const totalPoints = result.users?.reduce((sum, u) => sum + (u.master_points || 0), 0) || 0
        const totalCommissions = result.users?.reduce((sum, u) => sum + (u.commission_earned || 0), 0) || 0
        const totalAgents = result.users?.filter(u => u.is_agent === true).length || 0
        
        setStats({
          totalUsers: result.totalUsers || 0,
          spotsFilled: activeMatrix?.spots_filled || 0,
          recoveryFund: result.recoveryFund || 0,
          adminFees: result.adminFees || 0,
          currentMatrixNumber: activeMatrix?.matrix_number || 1,
          completedMatrices: result.completedMatrices || 0,
          percentFull: activeMatrix?.fillPercentage || 0,
          totalPointsIssued: totalPoints,
          totalCommissionsPaid: totalCommissions,
          maxLevel: 0,
          totalAgents: totalAgents
        })
      }
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPendingPayments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-get-payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      
      const result = await response.json()
      
      if (!result.success) throw new Error(result.error)
      
      const allPayments = result.payments || []
      const pending = allPayments.filter(p => p.status === 'pending')
      
      const userIds = [...new Set(pending.map(p => p.user_id).filter(id => id !== null))]
      let usersMap = {}
      
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email, name')
          .in('id', userIds)
        if (usersData) {
          usersMap = Object.fromEntries(usersData.map(u => [u.id, u]))
        }
      }
      
      const paymentsWithUsers = pending.map(p => ({ 
        ...p, 
        user: p.user_id ? usersMap[p.user_id] || { email: 'Unknown', name: 'Unknown' } : { email: 'Pending registration', name: 'New User' }
      }))
      
      setPendingPayments(paymentsWithUsers)
    } catch (error) { 
      console.error('Error loading pending payments:', error)
      setPendingPayments([])
    }
  }

  const loadPendingCashouts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-get-cashouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      
      const result = await response.json()
      
      if (!result.success) throw new Error(result.error)
      
      const allCashouts = result.cashouts || []
      const pending = allCashouts.filter(c => c.status === 'pending')
      
      const cashoutsWithUsers = pending.map(c => ({ 
        ...c, 
        user: c.user || { name: c.user_name || 'Unknown User', email: 'Unknown' }
      }))
      
      setPendingCashouts(cashoutsWithUsers)
    } catch (error) { 
      console.error('Error loading pending cashouts:', error)
      setPendingCashouts([])
    }
  }

  const loadAllNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(ADMIN_GET_NOTIFICATIONS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ limit: 100, filter: notificationFilter })
      })
      const result = await response.json()
      if (result.success) {
        setAllNotifications(result.notifications || [])
        setNotificationStats(result.stats)
      }
    } catch (error) { 
      console.error('Error loading notifications:', error) 
    }
  }

  const loadCompletionRules = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${MANAGE_RULES_URL}?action=list`, { headers: { 'Authorization': `Bearer ${session?.access_token}` } })
      const result = await response.json()
      if (result.success) setCompletionRules(result.rules)
    } catch (error) { 
      console.error('Error loading rules:', error) 
    }
  }

  const loadCompletionLog = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${MANAGE_RULES_URL}?action=log`, { headers: { 'Authorization': `Bearer ${session?.access_token}` } })
      const result = await response.json()
      if (result.success) setCompletionLog(result.log)
    } catch (error) { 
      console.error('Error loading completion log:', error) 
    }
  }

  const loadPromotions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(BONUS_ENGINE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'getAllPromotions', data: {} })
      })
      const result = await response.json()
      if (result.success) {
        setPromotions(result.promotions || [])
      }
    } catch (error) { 
      console.error('Error loading promotions:', error) 
    }
  }

  // ============================================
  // RAFFLE TICKET MANAGEMENT FUNCTIONS
  // ============================================

  const loadRaffleTicketRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('raffle_ticket_requests')
        .select('id, agent_id, promotion_id, quantity, status, created_at, agent:users!raffle_ticket_requests_agent_id_fkey(name, email), promotion:promotions(title)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (!error) {
        setRaffleTicketRequests(data || [])
        setPendingRaffleRequestsCount(data?.length || 0)
      }
    } catch (err) {
      console.error('Error loading raffle ticket requests:', err)
    }
  }

  const generateTicketsForRaffle = async () => {
    if (!generateTicketsRaffle) return
    if (generateTicketsQuantity < 1 || generateTicketsQuantity > 100000) {
      alert('Quantity must be between 1 and 100,000')
      return
    }

    setGenerateTicketsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-raffle-ticket-pool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          promotionId: generateTicketsRaffle.id,
          quantity: generateTicketsQuantity
        })
      })
      const result = await response.json()

      if (result.success) {
        alert(`✅ Generated ${result.quantityGenerated} tickets. Pool now has ${result.totalTicketsInRaffle} total.`)
        setShowGenerateTicketsModal(false)
        setGenerateTicketsRaffle(null)
        setGenerateTicketsQuantity(50)
      } else {
        alert('❌ ' + (result.error || 'Failed to generate tickets'))
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setGenerateTicketsLoading(false)
    }
  }

  const approveRaffleTicketRequest = async (requestId) => {
    setProcessingRaffleRequest(requestId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-approve-raffle-ticket-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ requestId, notes: `Approved by ${session.user.email}` })
      })
      const result = await response.json()
      if (result.success) {
        alert(`✅ ${result.message}`)
        loadRaffleTicketRequests()
      } else {
        alert('❌ ' + result.error)
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setProcessingRaffleRequest(null)
    }
  }

  const rejectRaffleTicketRequest = async (requestId) => {
    const notes = prompt('Enter reason for rejection:')
    if (!notes) return

    setProcessingRaffleRequest(requestId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-reject-raffle-ticket-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ requestId, notes })
      })
      const result = await response.json()
      if (result.success) {
        alert('✅ Request rejected.')
        loadRaffleTicketRequests()
      } else {
        alert('❌ ' + result.error)
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setProcessingRaffleRequest(null)
    }
  }

  // ============================================
  // MATRIX VISUALIZATION FUNCTIONS
  // ============================================

  const loadMatrixDetails = async () => {
    if (!selectedMatrixId) { alert('Please select a matrix'); return }
    
    try {
      const { data: matrix, error: matrixError } = await supabase
        .from('global_matrix')
        .select('id, matrix_number, is_active, created_at')
        .eq('id', selectedMatrixId)
        .maybeSingle()
      
      if (matrixError || !matrix) { 
        alert('Matrix not found'); 
        return 
      }
      
      const { data: allSpots, error: spotsError } = await supabase
        .from('matrix_spots')
        .select('*')
        .eq('matrix_id', selectedMatrixId)
        .order('position', { ascending: true })
      
      if (spotsError) {
        console.error('Error loading spots:', spotsError)
        return
      }
      
      const spotsFilled = allSpots?.filter(s => s.filled_at !== null).length || 0
      const rootSpot = allSpots?.find(s => s.position === 1 && s.level === 0)
      
      if (!rootSpot) {
        alert('Root spot (Position 1) not found in this matrix')
        return
      }
      
      const tree = buildMainMatrixTree(allSpots || [], rootSpot)
      setMatrixTreeData(tree)
      setMatrixDetails({ ...matrix, spots_filled: spotsFilled, total_spots: allSpots?.length || 0 })
      
      const initialExpanded = new Set()
      initialExpanded.add('pos-1')
      for (let i = 2; i <= 5; i++) {
        initialExpanded.add(`pos-${i}`)
      }
      setExpandedLevels(initialExpanded)
      setExpandedAll(false)
      
    } catch (error) { 
      console.error('Error loading matrix details:', error)
      alert('Error loading matrix details') 
    }
  }

  const buildMainMatrixTree = (allSpots, rootSpot) => {
    const spotMap = new Map()
    allSpots.forEach(spot => {
      spotMap.set(spot.position, spot)
    })
    
    const maxPosition = allSpots.length > 0 ? Math.max(...allSpots.map(s => s.position)) : 1
    
    const buildNode = (position, level, maxDepth = 10) => {
      if (level > maxDepth) return null
      if (position > maxPosition + 100) return null
      
      const spot = spotMap.get(position)
      const status = getSpotStatus(spot)
      
      const children = []
      const childPositions = getChildPositions(position)
      
      for (const childPos of childPositions) {
        if (childPos <= maxPosition + 10) {
          const childNode = buildNode(childPos, level + 1, maxDepth)
          if (childNode) {
            children.push(childNode)
          } else if (level + 1 <= 5) {
            children.push({
              position: childPos,
              level: level + 1,
              spot: null,
              status: 'empty',
              isEmpty: true,
              isPlaceholder: true,
              children: []
            })
          }
        }
      }
      
      return {
        position: position,
        level: level,
        spot: spot || null,
        status: status,
        slot: position > 1 ? calculateSlot(position) : null,
        parentPosition: position > 1 ? Math.floor((position + 2) / 4) : null,
        displayName: spot?.user_name || (spot?.reserved_until ? 'RESERVED' : (spot?.pending_signup_id ? 'PENDING' : 'EMPTY')),
        isEmpty: !spot,
        isPlaceholder: !spot,
        children: children.length > 0 ? children : null
      }
    }
    
    return buildNode(1, 0, 8)
  }

  const filterTreeByPosition = (node, searchPos) => {
    if (!node) return null
    if (!searchPos) return node
    
    const searchNum = parseInt(searchPos)
    if (isNaN(searchNum)) return node
    
    if (node.position === searchNum) return node
    
    if (node.children) {
      for (const child of node.children) {
        const found = filterTreeByPosition(child, searchPos)
        if (found) return found
      }
    }
    
    return null
  }

  const toggleLevel = (position) => {
    const newSet = new Set(expandedLevels)
    const key = `pos-${position}`
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setExpandedLevels(newSet)
  }

  const toggleExpandAll = () => {
    if (expandedAll) {
      const defaultExpanded = new Set()
      defaultExpanded.add('pos-1')
      for (let i = 2; i <= 5; i++) {
        defaultExpanded.add(`pos-${i}`)
      }
      setExpandedLevels(defaultExpanded)
      setExpandedAll(false)
    } else {
      const allExpanded = new Set()
      const collectPositions = (node) => {
        if (!node) return
        allExpanded.add(`pos-${node.position}`)
        if (node.children) {
          node.children.forEach(collectPositions)
        }
      }
      collectPositions(matrixTreeData)
      setExpandedLevels(allExpanded)
      setExpandedAll(true)
    }
  }

  const handleSpotClick = async (node) => {
    if (!node.spot) {
      alert(`Position ${node.position} is empty`)
      return
    }
    
    if (node.spot.user_id) {
      const { data: userDetails } = await supabase
        .from('users')
        .select('name, email, alias, master_points, commission_earned, referral_code')
        .eq('id', node.spot.user_id)
        .single()
      
      setSelectedSpotDetails({
        position: node.position,
        level: node.level,
        slot: node.slot,
        status: node.status,
        spot: node.spot,
        user: userDetails
      })
    } else {
      setSelectedSpotDetails({
        position: node.position,
        level: node.level,
        slot: node.slot,
        status: node.status,
        spot: node.spot,
        user: null
      })
    }
    setShowSpotModal(true)
  }

  const renderMatrixTree = (node, depth = 0) => {
    if (!node) return null
    
    const isExpanded = expandedLevels.has(`pos-${node.position}`)
    const hasChildren = node.children && node.children.length > 0
    const statusColor = getStatusColor(node.status)
    const statusLabel = getStatusLabel(node.status)
    
    if (searchPosition) {
      const searchNum = parseInt(searchPosition)
      if (!isNaN(searchNum) && node.position !== searchNum) {
        let hasMatchingChild = false
        const checkChildren = (n) => {
          if (n.position === searchNum) hasMatchingChild = true
          if (n.children) n.children.forEach(checkChildren)
        }
        if (node.children) node.children.forEach(checkChildren)
        if (!hasMatchingChild) return null
      }
    }
    
    return (
      <div key={node.position} style={{ marginLeft: depth * 20, marginBottom: 5 }}>
        <div 
          onClick={() => handleSpotClick(node)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '8px 12px', 
            background: node.spot ? `${statusColor}15` : 'transparent', 
            border: node.spot ? `2px solid ${statusColor}` : `1px dashed ${statusColor}`,
            borderRadius: 8, 
            cursor: 'pointer', 
            maxWidth: 350, 
            marginBottom: 5,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = `${statusColor}25`}
          onMouseLeave={(e) => e.currentTarget.style.background = node.spot ? `${statusColor}15` : 'transparent'}
        >
          <div style={{ 
            width: 32, 
            height: 32, 
            borderRadius: 6, 
            background: statusColor, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginRight: 12, 
            fontSize: 12, 
            color: '#0a0a2a', 
            fontWeight: 'bold' 
          }}>
            {node.position}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: node.spot ? 'white' : '#888', fontSize: 13, fontWeight: 'bold' }}>
              {node.displayName && node.displayName !== 'EMPTY' ? node.displayName : `Position ${node.position}`}
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#888' }}>
              <span>Level {node.level}</span>
              {node.slot && <span>Slot {node.slot}</span>}
              <span style={{ color: statusColor }}>{statusLabel}</span>
              {node.spot?.is_auto_entry && <span style={{ color: '#00ccff' }}>Auto-Entry</span>}
            </div>
          </div>
          {hasChildren && (
            <div 
              onClick={(e) => { e.stopPropagation(); toggleLevel(node.position) }} 
              style={{ color: '#ffa502', fontSize: 16, cursor: 'pointer', padding: '5px' }}
            >
              {isExpanded ? '▼' : '▶'}
            </div>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div style={{ borderLeft: `2px solid ${statusColor}`, marginLeft: 16, paddingLeft: 8 }}>
            {node.children.map(child => renderMatrixTree(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // ============================================
  // AGENT MANAGEMENT FUNCTIONS
  // ============================================

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, alias, is_agent, agent_tier, agent_code, agent_total_codes_sold, agent_commission_balance, agent_consignment_owed, created_at')
        .eq('is_agent', true)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setAgents(data || [])
    } catch (error) {
      console.error('Error loading agents:', error)
      setAgents([])
    }
  }

  const loadAgentRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-get-agent-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status: 'all', limit: 100 })
      })
      const result = await response.json()
      if (result.success) {
        setAgentRequests(result.requests || [])
      }
    } catch (error) {
      console.error('Error loading agent requests:', error)
    }
  }

  const approveAgentRequest = async (requestId) => {
    setProcessingRequest(requestId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-approve-agent-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ requestId, notes: `Approved by ${session.user.email}` })
      })
      const result = await response.json()
      if (result.success) {
        alert(`✅ ${result.message}`)
        loadAgentRequests()
        loadAgents()
      } else {
        alert('❌ ' + result.error)
      }
    } catch (error) {
      alert('Error approving request: ' + error.message)
    } finally {
      setProcessingRequest(null)
    }
  }

  const rejectAgentRequest = async (requestId) => {
    const notes = prompt('Enter reason for rejection:')
    if (!notes) return
    
    setProcessingRequest(requestId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-reject-agent-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ requestId, notes })
      })
      const result = await response.json()
      if (result.success) {
        alert('✅ Request rejected.')
        loadAgentRequests()
      } else {
        alert('❌ ' + result.error)
      }
    } catch (error) {
      alert('Error rejecting request: ' + error.message)
    } finally {
      setProcessingRequest(null)
    }
  }

  const activateAgent = async (user) => {
    if (!confirm(`Make "${user.name}" an agent?`)) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const agentCode = `MATRIX-AGENT-${user.alias.substring(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      const { error } = await supabase
        .from('users')
        .update({
          is_agent: true,
          agent_tier: 'agent',
          agent_code: agentCode,
          agent_activated_at: new Date().toISOString(),
          agent_activated_by: session.user.id
        })
        .eq('id', user.id)

      if (error) throw error

      alert(`✅ ${user.name} is now an agent!`)
      loadAgents()
      loadAdminData()
    } catch (error) {
      alert('Error activating agent: ' + error.message)
    }
  }

  const deactivateAgent = async (user) => {
    if (!confirm(`Remove agent status from "${user.name}"?`)) return

    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_agent: false,
          agent_tier: null,
          agent_code: null
        })
        .eq('id', user.id)

      if (error) throw error

      alert(`✅ ${user.name} is no longer an agent`)
      loadAgents()
      loadAdminData()
    } catch (error) {
      alert('Error deactivating agent: ' + error.message)
    }
  }

  const assignCodesToAgent = async () => {
    if (!selectedAgentUser) {
      alert('No agent selected')
      return
    }
    
    if (!selectedAgentUser.id) {
      console.error('Invalid agent user:', selectedAgentUser)
      alert('Invalid agent data. Please select an agent again.')
      return
    }
    
    if (agentCodeQuantity < 1 || agentCodeQuantity > 50) {
      alert('Quantity must be between 1 and 50')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const codes = []
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      for (let i = 0; i < agentCodeQuantity; i++) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
        const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        const part3 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        const code = `MATRIX-${part1}-${part2}-${part3}`
        codes.push(code)
      }

      for (const code of codes) {
        const { error } = await supabase
          .from('activation_codes')
          .insert({
            code: code,
            points_value: 5000,
            assigned_to: selectedAgentUser.id,
            assigned_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            status: 'active',
            purchase_tier: agentPurchaseTier,
            created_at: new Date().toISOString(),
            created_by: session.user.id
          })
        
        if (error) {
          console.error('Error inserting code:', error)
          throw error
        }
      }

      alert(`✅ Assigned ${codes.length} codes to ${selectedAgentUser.name || selectedAgentUser.alias}`)
      setShowAgentModal(false)
      setSelectedAgentUser(null)
      setAgentCodeQuantity(10)
      loadAgents()
    } catch (error) {
      console.error('Error assigning codes:', error)
      alert('Error assigning codes: ' + error.message)
    }
  }

  const loadAgentWithdrawals = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-get-agent-withdrawals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      
      const result = await response.json()
      
      if (!result.success) throw new Error(result.error)
      
      const withdrawals = result.withdrawals || []
      setAgentWithdrawals(withdrawals)
      setPendingWithdrawalsCount(withdrawals.filter(w => w.status === 'pending').length || 0)
    } catch (error) {
      console.error('Error loading agent withdrawals:', error)
      setAgentWithdrawals([])
      setPendingWithdrawalsCount(0)
    }
  }

  const processAgentWithdrawal = async (withdrawalId, action, method, rejectionReason = null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      let notes = ''
      if (action === 'reject') {
        notes = rejectionReason || 'Withdrawal rejected'
      }
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-process-agent-withdrawal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          withdrawalId,
          adminId: session.user.id,
          action,
          notes,
          ...(method && { method })
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert(`✅ Withdrawal ${action}ed successfully`)
        loadAgentWithdrawals()
        loadAgents()
      } else {
        alert('❌ ' + (result.error || result.message))
      }
    } catch (error) {
      alert('Error processing withdrawal: ' + error.message)
    }
  }

  // ============================================
  // RULE MANAGEMENT
  // ============================================

  const testCompletionRules = async () => {
    const activeMatrix = matrices.find(m => m.is_active)
    if (!activeMatrix) { alert('No active matrix found'); return }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${MANAGE_RULES_URL}?action=test&matrixId=${activeMatrix.id}`, { headers: { 'Authorization': `Bearer ${session?.access_token}` } })
      const result = await response.json()
      if (result.success) setRuleTestResult(result)
    } catch (error) { 
      console.error('Error testing rules:', error) 
    }
  }

  const createNewRule = async () => {
    if (!newRule.rule_name || !newRule.threshold_value) { alert('Please fill in all required fields'); return }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(MANAGE_RULES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(newRule)
      })
      const result = await response.json()
      if (result.success) {
        alert('✅ Rule created successfully')
        setShowCreateRuleModal(false)
        setNewRule({ rule_type: 'spots', rule_name: '', threshold_value: 0, comparison_operator: '>=', priority: 50, description: '' })
        loadCompletionRules()
      } else alert('❌ ' + result.message)
    } catch (error) { 
      alert('Error creating rule') 
    }
  }

  const toggleRuleActive = async (ruleId, isActive) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(MANAGE_RULES_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ id: ruleId, is_active: isActive })
      })
      const result = await response.json()
      if (result.success) loadCompletionRules()
    } catch (error) { 
      console.error('Error toggling rule:', error) 
    }
  }

  const deleteRule = async (ruleId) => {
    if (!confirm('Delete this rule?')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${MANAGE_RULES_URL}?id=${ruleId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session?.access_token}` } })
      const result = await response.json()
      if (result.success) loadCompletionRules()
    } catch (error) { 
      console.error('Error deleting rule:', error) 
    }
  }

  // ============================================
  // PROMOTION MANAGEMENT
  // ============================================

  const createPromotion = async () => {
    if (!newPromotion.title || !newPromotion.prize_description || !newPromotion.entry_cost || !newPromotion.end_date) {
      alert('Please fill in all required fields')
      return
    }

    const startDateUTC = newPromotion.start_date ? localToUTC(newPromotion.start_date) : null
    const endDateUTC = localToUTC(newPromotion.end_date)

    const promotionData = {
      title: newPromotion.title,
      description: newPromotion.description,
      prize_description: newPromotion.prize_description,
      prize_points: newPromotion.prize_points || 0,
      entry_cost: newPromotion.entry_cost,
      start_date: startDateUTC,
      end_date: endDateUTC,
      max_entries_per_user: newPromotion.max_entries_per_user,
      is_active: newPromotion.is_active,
      auto_draw: newPromotion.auto_draw,
      allow_non_member_entry: newPromotion.allow_non_member_entry || false,
      max_tickets_per_agent: newPromotion.max_tickets_per_agent || 50
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(BONUS_ENGINE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          action: 'createPromotion',
          data: promotionData
        })
      })
      const result = await response.json()
      if (result.success) {
        alert('✅ Promotion created successfully!')
        setShowCreatePromotionModal(false)
        setEditingPromotion(null)
        setNewPromotion({
          title: '',
          description: '',
          prize_description: '',
          prize_points: 0,
          entry_cost: 500,
          start_date: '',
          end_date: '',
          max_entries_per_user: 1,
          is_active: true,
          auto_draw: true,
          allow_non_member_entry: false,
          max_tickets_per_agent: 50
        })
        loadPromotions()
        loadAllNotifications()
      } else {
        alert('❌ ' + result.error)
      }
    } catch (error) {
      alert('Error creating promotion')
    }
  }

  const updatePromotion = async (promotionId, updates) => {
    const updatesUTC = { ...updates }
    if (!updates.start_date || updates.start_date.trim() === '') {
      updatesUTC.start_date = null
    } else {
      updatesUTC.start_date = localToUTC(updates.start_date)
    }
    if (!updates.end_date || updates.end_date.trim() === '') {
      updatesUTC.end_date = null
    } else {
      updatesUTC.end_date = localToUTC(updates.end_date)
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(BONUS_ENGINE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          action: 'updatePromotion',
          data: { promotionId, updates: updatesUTC }
        })
      })
      const result = await response.json()
      if (result.success) {
        alert('✅ Promotion updated successfully!')
        setShowCreatePromotionModal(false)
        setEditingPromotion(null)
        loadPromotions()
      } else {
        alert('❌ ' + result.error)
      }
    } catch (error) {
      alert('Error updating promotion')
    }
  }

  const deletePromotion = async (promotionId) => {
    if (!confirm('Delete this promotion? This will also delete all entries.')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(BONUS_ENGINE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          action: 'deletePromotion',
          data: { promotionId }
        })
      })
      const result = await response.json()
      if (result.success) {
        alert('✅ Promotion deleted successfully!')
        loadPromotions()
      } else {
        alert('❌ ' + result.error)
      }
    } catch (error) {
      alert('Error deleting promotion')
    }
  }

  const drawWinner = async (promotionId) => {
    if (!confirm('Draw winner for this raffle? This action cannot be undone.')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(BONUS_ENGINE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          action: 'drawRaffleWinner',
          data: { promotionId }
        })
      })
      const result = await response.json()
      if (result.success) {
        alert(`✅ Winner drawn! ${result.prizeDescription}`)
        loadPromotions()
        loadAllNotifications()
      } else {
        alert('❌ ' + result.error)
      }
    } catch (error) {
      alert('Error drawing winner')
    }
  }

  // ============================================
  // NOTIFICATION FUNCTIONS
  // ============================================

  const sendSystemNotification = async () => {
    if (!systemNotificationTitle || !systemNotificationMessage) {
      alert('Please enter a title and message')
      return
    }
    setNotificationSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(SEND_SYSTEM_NOTIFICATION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          title: systemNotificationTitle,
          message: systemNotificationMessage,
          sendTo: sendToAllUsers === 'all_agents' ? 'all_agents' : 'all_users',
          isSystemWide: sendToAllUsers,
          senderId: null,
          senderName: 'System Admin'
        })
      })
      const result = await response.json()
      if (result.success) {
        alert(`✅ Notification sent to ${result.recipientCount} users!`)
        setSystemNotificationTitle('')
        setSystemNotificationMessage('')
        loadAllNotifications()
      } else {
        alert('❌ ' + result.message)
      }
    } catch (error) { 
      alert('Error sending notification') 
    }
    finally { 
      setNotificationSending(false) 
    }
  }

  // ============================================
  // PAYMENT AND CASHOUT
  // ============================================

  const approvePayment = async (paymentId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(APPROVE_PAYMENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ paymentId, adminId: session.user.id, notes: paymentNotes[paymentId] || '' })
      })
      const result = await response.json()
      if (result.success) {
        alert('✅ Payment approved and points added!')
        setPaymentNotes(prev => ({ ...prev, [paymentId]: '' }))
        loadPendingPayments()
        loadAdminData()
      } else alert('❌ ' + result.message)
    } catch (error) { 
      alert('Error approving payment') 
    }
  }

  const rejectPayment = async (paymentId) => {
    const notes = paymentNotes[paymentId] || ''
    if (!notes) { alert('Please enter a reason for rejection'); return }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(REJECT_PAYMENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ paymentId, adminId: session.user.id, notes })
      })
      const result = await response.json()
      if (result.success) {
        alert('✅ Payment rejected')
        setPaymentNotes(prev => ({ ...prev, [paymentId]: '' }))
        loadPendingPayments()
      } else alert('❌ ' + result.message)
    } catch (error) { 
      alert('Error rejecting payment') 
    }
  }

  const approveCashoutAuto = async (cashoutId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(CREATE_PAYOUT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ cashoutId, adminId: session.user.id, action: 'approve' })
      })
      const result = await response.json()
      if (result.success) {
        alert('✅ Auto payout initiated!')
        setCashoutNotes(prev => ({ ...prev, [cashoutId]: '' }))
        loadPendingCashouts()
        loadAdminData()
      } else alert('❌ ' + result.message)
    } catch (error) { 
      alert('Error creating payout') 
    }
  }

  const approveCashoutManual = async (cashoutId) => {
    const hash = txHash[cashoutId] || ''
    if (!hash) { 
      alert('Please enter the transaction hash')
      return 
    }
    
    const cashout = pendingCashouts.find(c => c.id === cashoutId)
    
    if (!cashout) {
      alert('Cashout request not found. Please refresh.')
      return
    }
    
    const feePoints = Math.floor(cashout.points_amount * 0.01)
    const netPoints = cashout.points_amount - feePoints
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(APPROVE_CASHOUT_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          cashoutId, 
          adminId: session.user.id, 
          netPoints, 
          feePoints, 
          transactionHash: hash,
          notes: cashoutNotes[cashoutId] || '',
          action: 'approve'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('✅ Cashout approved!')
        setTxHash(prev => ({ ...prev, [cashoutId]: '' }))
        setCashoutNotes(prev => ({ ...prev, [cashoutId]: '' }))
        
        setTimeout(() => {
          loadPendingCashouts()
          loadAdminData()
        }, 500)
        
      } else {
        alert('❌ ' + (result.error || result.message))
      }
    } catch (error) { 
      alert('Error approving cashout: ' + error.message)
    }
  }

  const rejectCashout = async (cashoutId) => {
    const notes = cashoutNotes[cashoutId] || ''
    if (!notes) { alert('Please enter a reason for rejection'); return }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(REJECT_CASHOUT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ cashoutId, adminId: session.user.id, notes, action: 'reject' })
      })
      const result = await response.json()
      if (result.success) {
        alert('✅ Cashout rejected and points refunded!')
        setCashoutNotes(prev => ({ ...prev, [cashoutId]: '' }))
        loadPendingCashouts()
        loadAdminData()
      } else alert('❌ ' + result.message)
    } catch (error) { 
      alert('Error rejecting cashout') 
    }
  }

  const getNotificationTypeLabel = (type) => {
    const labels = {
      'payment_approved': '💰 Payment', 'payment_rejected': '❌ Payment', 'cashout_approved': '💸 Cashout',
      'cashout_rejected': '↩️ Cashout', 'cashout_processing': '💸 Processing', 'referral_joined': '🎉 Referral',
      'quick_start_bonus': '🚀 Bonus', 'system_announcement': '📢 System',
      'promotion_available': '🎲 Raffle', 'raffle_winner': '🏆 Winner', 'raffle_ended': '🎲 Raffle Ended',
      'raffle_entry_confirmed': '✅ Entry', 'raffle_expired_no_winner': '🔥 Expired',
      'bonus_paid': '💰 Bonus Paid'
    }
    return labels[type] || type?.replace(/_/g, ' ') || 'Unknown'
  }

  // ============================================
  // SYSTEM CONTROL
  // ============================================

  const handleManualMatrixCompletion = async () => {
    const matrixId = prompt('Enter Matrix ID to manually complete:')
    if (!matrixId) return
    if (!confirm(`⚠️ Manually complete Matrix ID ${matrixId}?`)) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(COMPLETE_MATRIX_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: 'executeCompletion', data: { matrixId: parseInt(matrixId) } })
      })
      const result = await response.json()
      if (result.success) alert(`✅ ${result.message}`)
      else alert(`❌ ${result.error || result.message}`)
      loadAdminData()
    } catch (error) { 
      alert('Error completing matrix') 
    }
  }

  const simulateSignups = async () => {
    const count = prompt('How many signups to simulate?', '5')
    if (!count) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${SUPABASE_URL}/functions/v1/simulate-signups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ count: parseInt(count) })
      })
      const result = await response.json()
      if (result.success) alert(`✅ ${result.message}`)
      else alert(`❌ ${result.message}`)
      loadAdminData()
    } catch (error) { 
      alert('Error simulating signups') 
    }
  }

  const resetSystem = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL data. Type "RESET" to confirm.')) return
    const confirmText = prompt('Type "RESET" to confirm.')
    if (confirmText !== 'RESET') return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${SUPABASE_URL}/functions/v1/reset-system`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }
      })
      const result = await response.json()
      if (result.success) alert('✅ System reset successfully')
      else alert(`❌ ${result.message}`)
      loadAdminData()
    } catch (error) { 
      alert('Error resetting system') 
    }
  }

  // ============================================
  // USER MANAGEMENT
  // ============================================

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
    let availableBalance = transferFrom === 'admin_fees' ? stats.adminFees : stats.recoveryFund
    if (parseInt(transferAmount) > availableBalance) { 
      alert(`Insufficient balance. Available: ${availableBalance.toLocaleString()} points`)
      return 
    }
    setTransferLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(TRANSFER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
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
    if (!confirm(`⚠️ Disable user ${user.name}?`)) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(DISABLE_USER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
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
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(DISABLE_USER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
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

  const resetUserPassword = async (user) => {
    const newPassword = prompt(`Enter new password for ${user.name}:`)
    if (!newPassword) return
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    
    if (!confirm(`Reset password for ${user.name}? They will need to login with the new password.`)) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ userId: user.id, newPassword })
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert(`✅ Password reset for ${user.name}`)
      } else {
        alert('❌ ' + result.error)
      }
    } catch (error) {
      alert('Error resetting password: ' + error.message)
    }
  }

  const handleLogout = async () => { 
    await supabase.auth.signOut()
    sessionStorage.removeItem('isAdmin')
    navigate('/login')
  }

  // ============================================
  // USE EFFECTS
  // ============================================

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const allowedAdmins = ['admin@the-matrix.app', 'admin@thematrix.com', 'root@thematrix.com']
      if (!session || !allowedAdmins.includes(session.user.email?.toLowerCase())) {
        navigate('/login')
      }
    }
    checkAdmin()
  }, [navigate])

  useEffect(() => {
    loadAdminData()
    loadPendingPayments()
    loadPendingCashouts()
    loadAllNotifications()
    loadCompletionRules()
    loadCompletionLog()
    loadPromotions()
    loadAgents()
    loadAgentRequests()
    loadAgentWithdrawals()
    fetchCryptoWallets()
    loadRaffleTicketRequests()
    loadBonusSettings()
  }, [])

  useEffect(() => {
    if (activeTab === 'payments') loadPendingPayments()
    if (activeTab === 'cashouts') loadPendingCashouts()
    if (activeTab === 'notifications') loadAllNotifications()
    if (activeTab === 'agents') {
      loadAgents()
      loadAgentRequests()
      loadAgentWithdrawals()
    }
    if (activeTab === 'settings') {
      loadRaffleTicketRequests()
      loadBonusSettings()
    }
  }, [activeTab, notificationFilter])

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredUsers(users.slice(0, 50))
    } else {
      const term = searchTerm.toLowerCase()
      setFilteredUsers(users.filter(user => 
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.referral_code?.toLowerCase().includes(term)
      ).slice(0, 50))
    }
  }, [searchTerm, users])

  const pendingPaymentsCount = pendingPayments.length
  const pendingCashoutsCount = pendingCashouts.length
  const pendingAgentRequestsCount = agentRequests.filter(r => r.status === 'pending').length
  const filteredTree = searchPosition ? filterTreeByPosition(matrixTreeData, searchPosition) : matrixTreeData

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #ffa502', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'white', marginTop: '15px' }}>Loading admin dashboard...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }
  
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a3a', padding: '15px 30px', borderBottom: '1px solid #ffa502' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <h1 style={{ color: '#ffa502', margin: 0, cursor: 'pointer' }} onClick={() => navigate('/')}>👑 SIGMA-PLUS | ADMIN (V5.0)</h1>
          <span style={{ background: '#ffa50220', color: '#ffa502', padding: '4px 12px', borderRadius: 20, fontSize: 14, border: '1px solid #ffa502' }}>Agent Network Enabled</span>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#ff4444', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer' }}>Logout</button>
      </div>

      <div style={{ maxWidth: 1400, margin: '30px auto 0', padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: 5, borderBottom: '1px solid #333', paddingBottom: 10, flexWrap: 'wrap' }}>
          {['overview', 'users', 'matrices', 'transactions', 'payments', 'cashouts', 'notifications', 'agents', 'settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '10px 20px', background: activeTab === tab ? '#ffa502' : 'transparent', border: 'none', borderRadius: 5, color: activeTab === tab ? '#0a0a2a' : '#aaa', fontWeight: 'bold', cursor: 'pointer', textTransform: 'capitalize', position: 'relative' }}>
              {tab === 'overview' && '📊 '}{tab === 'users' && '👥 '}{tab === 'matrices' && '🔷 '}{tab === 'transactions' && '📜 '}{tab === 'payments' && '💰 '}{tab === 'cashouts' && '💸 '}{tab === 'notifications' && '🔔 '}{tab === 'agents' && '🤝 '}{tab === 'settings' && '⚙️ '}{tab}
              {tab === 'payments' && pendingPaymentsCount > 0 && <span style={{ marginLeft: 8, background: '#ff4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: 10, fontWeight: 'bold' }}>{pendingPaymentsCount}</span>}
              {tab === 'cashouts' && pendingCashoutsCount > 0 && <span style={{ marginLeft: 8, background: '#ff4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: 10, fontWeight: 'bold' }}>{pendingCashoutsCount}</span>}
              {tab === 'notifications' && notificationStats.unread > 0 && <span style={{ marginLeft: 8, background: '#ff4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: 10, fontWeight: 'bold' }}>{notificationStats.unread}</span>}
              {tab === 'agents' && pendingAgentRequestsCount > 0 && <span style={{ marginLeft: 8, background: '#ffa502', color: '#0a0a2a', borderRadius: '50%', padding: '2px 6px', fontSize: 10, fontWeight: 'bold' }}>{pendingAgentRequestsCount}</span>}
              {tab === 'settings' && pendingRaffleRequestsCount > 0 && <span style={{ marginLeft: 8, background: '#9b59b6', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: 10, fontWeight: 'bold' }}>{pendingRaffleRequestsCount}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '20px auto', padding: '0 20px' }}>
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 30 }}>
              <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, textAlign: 'center', border: '1px solid #ffa502' }}><h3 style={{ color: '#aaa' }}>Total Users</h3><h2 style={{ color: '#ffa502', fontSize: 32, margin: 0 }}>{formatNumber(stats.totalUsers)}</h2></div>
              <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, textAlign: 'center', border: '1px solid #ffa502' }}><h3 style={{ color: '#aaa' }}>Total Points</h3><h2 style={{ color: '#ffa502', fontSize: 32, margin: 0 }}>{formatNumber(stats.totalPointsIssued)}</h2></div>
              <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, textAlign: 'center', border: '1px solid #ffa502' }}><h3 style={{ color: '#aaa' }}>Recovery Fund</h3><h2 style={{ color: '#00ff88', fontSize: 32, margin: 0 }}>{formatNumber(stats.recoveryFund)}</h2></div>
              <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, textAlign: 'center', border: '1px solid #ffa502' }}><h3 style={{ color: '#aaa' }}>Admin Fees</h3><h2 style={{ color: '#00ccff', fontSize: 32, margin: 0 }}>{formatNumber(stats.adminFees)}</h2></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30 }}>
              <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, border: '1px solid #ffa502' }}><h3 style={{ color: '#ffa502' }}>📊 Matrix #{stats.currentMatrixNumber} Status</h3><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}><div><p style={{ color: '#888', fontSize: 12 }}>Fill Percentage</p><p style={{ color: '#00ff88', fontSize: 24, fontWeight: 'bold' }}>{stats.percentFull}%</p></div><div><p style={{ color: '#888', fontSize: 12 }}>Completed Matrices</p><p style={{ color: '#ffa502', fontSize: 24, fontWeight: 'bold' }}>{stats.completedMatrices}</p></div></div></div>
              <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, border: '1px solid #ffa502' }}><h3 style={{ color: '#ffa502' }}>🏆 System Summary</h3><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}><div><p style={{ color: '#888', fontSize: 12 }}>Pending Payments</p><p style={{ color: pendingPaymentsCount > 0 ? '#ff4444' : '#ffa502', fontSize: 24, fontWeight: 'bold' }}>{pendingPaymentsCount}</p></div><div><p style={{ color: '#888', fontSize: 12 }}>Pending Cashouts</p><p style={{ color: pendingCashoutsCount > 0 ? '#ff4444' : '#ffa502', fontSize: 24, fontWeight: 'bold' }}>{pendingCashoutsCount}</p></div><div><p style={{ color: '#888', fontSize: 12 }}>Commissions Paid</p><p style={{ color: '#ffa502', fontSize: 24, fontWeight: 'bold' }}>{formatNumber(stats.totalCommissionsPaid)}</p></div><div><p style={{ color: '#888', fontSize: 12 }}>Active Agents</p><p style={{ color: '#9b59b6', fontSize: 24, fontWeight: 'bold' }}>{stats.totalAgents}</p></div></div></div>
            </div>
          </>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
              <h2 style={{ color: '#ffa502', margin: 0 }}>👥 User Management</h2>
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 5, border: '1px solid #ffa502', background: '#0a0a2a', color: 'white' }} />
              <button onClick={loadAdminData} style={{ padding: '10px 20px', background: '#ffa502', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer' }}>🔄 Refresh</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ffa502' }}>
                    <th style={{ textAlign: 'left', padding: 10, color: '#ffa502' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: 10, color: '#ffa502' }}>Email</th>
                    <th style={{ textAlign: 'right', padding: 10, color: '#ffa502' }}>Points</th>
                    <th style={{ textAlign: 'right', padding: 10, color: '#ffa502' }}>Commission</th>
                    <th style={{ textAlign: 'center', padding: 10, color: '#ffa502' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: 10, color: 'white' }}>
                        {u.name}
                        {(() => {
                          const state = getUserState(u)
                          const color = state === 'disabled' ? '#ff4444' : state === 'frozen' ? '#00ccff' : '#00ff88'
                          const label = state === 'disabled' ? 'Disabled' : state === 'frozen' ? 'Frozen' : 'Enabled'
                          return (
                            <span style={{ marginLeft: 8, background: `${color}20`, color, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 'bold', border: `1px solid ${color}` }}>
                              {label}
                            </span>
                          )
                        })()}
                      </td>
                      <td style={{ padding: 10, color: '#aaa' }}>{u.email}</td>
                      <td style={{ padding: 10, textAlign: 'right', color: '#00ff88' }}>{formatNumber(u.master_points)}</td>
                      <td style={{ padding: 10, textAlign: 'right', color: '#ffa502' }}>{formatNumber(u.commission_earned)}</td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        <button onClick={() => openTransferModal(u)} style={{ background: '#00ccff', border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', color: 'white', marginRight: 5 }} title="Transfer Points">💰</button>
                        {getUserState(u) === 'enabled' ? (
                          <button onClick={() => disableUser(u)} style={{ background: '#ff4444', border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', color: 'white', marginRight: 5 }} title="Disable">🚫 Disable</button>
                        ) : (
                          <button onClick={() => enableUser(u)} style={{ background: '#00ff88', border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', color: '#0a0a2a', marginRight: 5 }} title="Enable">✅ Enable</button>
                        )}
                        <button onClick={() => resetUserPassword(u)} style={{ background: '#ffa502', border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', color: '#0a0a2a', marginRight: 5 }} title="Reset Pwd">🔐</button>
                        {!u.is_agent && (
                          <button onClick={() => activateAgent(u)} style={{ background: '#9b59b6', border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', color: 'white' }} title="Make Agent">👤 Agent</button>
                        )}
                        {u.is_agent && <span style={{ color: '#00ff88', fontSize: 12, marginLeft: 5 }}>✅ Agent</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MATRICES TAB */}
        {activeTab === 'matrices' && (
          <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10 }}>
            <h2 style={{ color: '#ffa502' }}>🔷 Main Matrix Visualization</h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
              <select value={selectedMatrixId || ''} onChange={(e) => setSelectedMatrixId(e.target.value ? parseInt(e.target.value) : null)} style={{ padding: 10, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }}>
                <option value="">Select a matrix...</option>
                {matrices.map(m => <option key={m.id} value={m.id}>Matrix #{m.matrix_number} {m.is_active ? '(Active)' : '(Completed)'} - {m.spots_filled || 0} spots</option>)}
              </select>
              <button onClick={loadMatrixDetails} style={{ padding: '10px 20px', background: '#ffa502', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer' }}>🔍 Load Matrix</button>
              {matrixDetails && (
                <>
                  <button onClick={toggleExpandAll} style={{ padding: '10px 20px', background: '#333', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer' }}>{expandedAll ? '📁 Collapse All' : '📂 Expand All'}</button>
                </>
              )}
            </div>
            
            {matrixTreeData && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, padding: 15, background: '#0a0a2a', borderRadius: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#aaa', fontSize: 12, display: 'block', marginBottom: 5 }}>🔍 Search by Position</label>
                  <input type="number" placeholder="Enter position number..." value={searchPosition} onChange={(e) => setSearchPosition(e.target.value)} style={{ width: '100%', padding: 8, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#aaa', fontSize: 12, display: 'block', marginBottom: 5 }}>🎨 Filter by Status</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%', padding: 8, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }}>
                    <option value="all">All Spots</option>
                    <option value="filled">Filled Only</option>
                    <option value="auto_entry">Auto-Entry Only</option>
                    <option value="reserved">Reserved Only</option>
                    <option value="pending">Pending Only</option>
                    <option value="empty">Empty Only</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: '#aaa', fontSize: 12, display: 'block', marginBottom: 5 }}>&nbsp;</label>
                  <button onClick={() => { setSearchPosition(''); setStatusFilter('all'); }} style={{ padding: '8px 16px', background: '#333', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white', width: '100%' }}>Clear Filters</button>
                </div>
              </div>
            )}
            
            {matrixDetails && (
              <div style={{ background: '#0a0a2a', padding: 15, borderRadius: 10, marginBottom: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div><span style={{ color: '#888' }}>Matrix #:</span> <span style={{ color: '#00ff88', fontWeight: 'bold' }}>{matrixDetails.matrix_number}</span></div>
                <div><span style={{ color: '#888' }}>Status:</span> <span style={{ color: matrixDetails.is_active ? '#00ff88' : '#ff6666', fontWeight: 'bold' }}>{matrixDetails.is_active ? 'ACTIVE' : 'COMPLETED'}</span></div>
                <div><span style={{ color: '#888' }}>Spots Filled:</span> <span style={{ color: '#ffa502', fontWeight: 'bold' }}>{matrixDetails.spots_filled}</span></div>
                <div><span style={{ color: '#888' }}>Total Spots:</span> <span style={{ color: '#00ccff', fontWeight: 'bold' }}>{matrixDetails.total_spots || matrixDetails.spots_filled}</span></div>
                <div><span style={{ color: '#888' }}>Created:</span> <span style={{ color: '#aaa' }}>{new Date(matrixDetails.created_at).toLocaleDateString()}</span></div>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20, padding: 10, background: '#0a0a2a', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 16, height: 16, background: '#00ff88', borderRadius: 4 }}></div><span style={{ color: '#aaa', fontSize: 12 }}>Filled</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 16, height: 16, background: '#00ccff', borderRadius: 4 }}></div><span style={{ color: '#aaa', fontSize: 12 }}>Auto-Entry</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 16, height: 16, background: '#ffa502', borderRadius: 4 }}></div><span style={{ color: '#aaa', fontSize: 12 }}>Reserved</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 16, height: 16, background: '#ffcc00', borderRadius: 4 }}></div><span style={{ color: '#aaa', fontSize: 12 }}>Pending</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 16, height: 16, background: 'rgba(255,255,255,0.1)', border: '1px dashed #555', borderRadius: 4 }}></div><span style={{ color: '#aaa', fontSize: 12 }}>Empty</span></div>
            </div>
            
            {matrixTreeData && (
              <div style={{ marginTop: 20, overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
                {filteredTree ? renderMatrixTree(filteredTree) : <p style={{ textAlign: 'center', color: '#ff6666', padding: 40 }}>Position {searchPosition} not found</p>}
              </div>
            )}
            
            {!matrixTreeData && selectedMatrixId && (
              <p style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>Click "Load Matrix" to view the matrix visualization</p>
            )}
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
          <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, overflowX: 'auto' }}>
            <h2 style={{ color: '#ffa502', marginBottom: 20 }}>📜 Recent Transactions</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ffa502' }}>
                  <th style={{ textAlign: 'left', padding: 10, color: '#ffa502' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: 10, color: '#ffa502' }}>User</th>
                  <th style={{ textAlign: 'left', padding: 10, color: '#ffa502' }}>Type</th>
                  <th style={{ textAlign: 'right', padding: 10, color: '#ffa502' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 50).map((tx, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: 10, color: '#aaa' }}>{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : '-'}</td>
                    <td style={{ padding: 10, color: 'white' }}>{tx.user_name || '-'}</td>
                    <td style={{ padding: 10, color: '#aaa' }}>{tx.type?.replace(/_/g, ' ') || '-'}</td>
                    <td style={{ padding: 10, textAlign: 'right', color: tx.amount > 0 ? '#00ff88' : '#ff6666' }}>{tx.amount > 0 ? '+' : ''}{formatNumber(tx.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10 }}>
            <h2 style={{ color: '#ffa502' }}>💰 Pending Payments ({pendingPaymentsCount})</h2>
            {pendingPayments.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>No pending payments</p>
            ) : (
              pendingPayments.map(p => (
                <div key={p.id} style={{ background: '#0a0a2a', padding: 20, borderRadius: 10, marginBottom: 15, border: '1px solid #333' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 15 }}>
                    <div><div style={{ color: '#888', fontSize: 11 }}>User</div><div style={{ color: 'white', fontWeight: 'bold' }}>{p.user?.name || p.user_name || 'Unknown'}</div><div style={{ color: '#aaa', fontSize: 12 }}>{p.user?.email || 'No email'}</div></div>
                    <div><div style={{ color: '#888', fontSize: 11 }}>Date & Time</div><div style={{ color: '#00ff88' }}>{p.requested_at ? new Date(p.requested_at).toLocaleString() : 'Unknown'}</div></div>
                    <div><div style={{ color: '#888', fontSize: 11 }}>Amount</div><div style={{ color: '#ffa502', fontWeight: 'bold' }}>${p.usd_amount} USD ({p.points_amount.toLocaleString()} points)</div></div>
                    <div><div style={{ color: '#888', fontSize: 11 }}>Type</div><div style={{ color: '#00ccff' }}>{p.type === 'registration' ? '📝 New Registration' : '💰 Load Points'}</div></div>
                  </div>
                  <div style={{ background: '#0a0a2a', padding: 15, borderRadius: 8, marginBottom: 15 }}>
                    <div style={{ color: '#ffa502', fontSize: 12, marginBottom: 10 }}>🔗 Transaction Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 8 }}>
                      <div><div style={{ color: '#888', fontSize: 10 }}>Transaction Hash</div><code style={{ color: '#00ff88', fontSize: 11, wordBreak: 'break-all' }}>{p.transaction_hash || 'Not provided'}</code></div>
                      <div><div style={{ color: '#888', fontSize: 10 }}>Sender Address</div><code style={{ color: '#00ccff', fontSize: 11, wordBreak: 'break-all' }}>{p.sender_address || 'Not provided'}</code></div>
                      <div><div style={{ color: '#888', fontSize: 10 }}>Crypto Amount</div><div style={{ color: '#ffa502' }}>{p.crypto_amount || p.usd_amount} {p.crypto_currency || 'USDT'}</div></div>
                    </div>
                  </div>
                  <textarea placeholder="Admin notes (reason for approval/rejection)" value={paymentNotes[p.id] || ''} onChange={e => setPaymentNotes({...paymentNotes, [p.id]: e.target.value})} rows={2} style={{ width: '100%', marginBottom: 15, padding: 10, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5, resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => approvePayment(p.id)} style={{ background: '#00ff88', padding: '10px 20px', border: 'none', borderRadius: 5, cursor: 'pointer', color: '#0a0a2a', fontWeight: 'bold' }}>✅ Approve</button>
                    <button onClick={() => rejectPayment(p.id)} style={{ background: '#ff4444', padding: '10px 20px', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white' }}>❌ Reject</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CASHOUTS TAB */}
        {activeTab === 'cashouts' && (
          <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10 }}>
            <h2 style={{ color: '#ffa502' }}>💸 Pending Cashouts ({pendingCashoutsCount})</h2>
            {pendingCashouts.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>No pending cashouts</p>
            ) : (
              pendingCashouts.map(c => {
                const grossPoints = c.points_amount || 0
                const feePoints = Math.floor(grossPoints * 0.01)
                const netPoints = grossPoints - feePoints
                const netUsd = netPoints / 200
                const grossUsd = grossPoints / 200
                
                return (
                  <div key={c.id} style={{ background: '#0a0a2a', padding: 20, borderRadius: 10, marginBottom: 15, border: '1px solid #333' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 15 }}>
                      <div>
                        <strong style={{ color: 'white', fontSize: 16 }}>{c.user?.name || c.user_name || 'Unknown User'}</strong>
                        <span style={{ color: '#aaa', marginLeft: 10 }}>({c.user?.email || 'Unknown email'})</span>
                      </div>
                      <div style={{ color: '#00ff88', fontSize: 20, fontWeight: 'bold' }}>
                        ${netUsd.toFixed(2)} USD
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 15, background: '#0d0d12', padding: 12, borderRadius: 8 }}>
                      <div>
                        <span style={{ color: '#888' }}>📊 Gross Request:</span>
                        <div><span style={{ color: '#ff6666' }}>{grossPoints.toLocaleString()} points</span> <span style={{ color: '#aaa' }}>(${grossUsd.toFixed(2)})</span></div>
                      </div>
                      <div>
                        <span style={{ color: '#888' }}>💸 Fee (1%):</span>
                        <div><span style={{ color: '#ffa502' }}>-{feePoints.toLocaleString()} points</span> <span style={{ color: '#aaa' }}>(-${(feePoints/200).toFixed(2)})</span></div>
                      </div>
                      <div>
                        <span style={{ color: '#888' }}>💰 Net to User:</span>
                        <div><span style={{ color: '#00ff88', fontWeight: 'bold' }}>{netPoints.toLocaleString()} points</span> <span style={{ color: '#00ff88' }}>= ${netUsd.toFixed(2)}</span></div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10, marginBottom: 15 }}>
                      <div><span style={{ color: '#888' }}>🏦 Wallet Address:</span> <code style={{ color: '#00ccff', fontSize: 11, wordBreak: 'break-all' }}>{c.wallet_address || 'N/A'}</code></div>
                      <div><span style={{ color: '#888' }}>💎 Crypto Type:</span> <span style={{ color: '#00ccff', textTransform: 'capitalize' }}>{c.crypto_type || 'USDT'}</span></div>
                      <div><span style={{ color: '#888' }}>📅 Requested:</span> <span style={{ color: '#aaa' }}>{new Date(c.requested_at).toLocaleString()}</span></div>
                    </div>
                    
                    <input 
                      type="text" 
                      placeholder="Admin notes (reason for approval/rejection)" 
                      value={cashoutNotes[c.id] || ''} 
                      onChange={e => setCashoutNotes({...cashoutNotes, [c.id]: e.target.value})} 
                      style={{ width: '100%', margin: '10px 0', padding: 8, background: '#0d0d12', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }} 
                    />
                    <input 
                      type="text" 
                      placeholder="Transaction Hash (for manual approval)" 
                      value={txHash[c.id] || ''} 
                      onChange={e => setTxHash({...txHash, [c.id]: e.target.value})} 
                      style={{ width: '100%', margin: '10px 0', padding: 8, background: '#0d0d12', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }} 
                    />
                    
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                      <button onClick={() => approveCashoutAuto(c.id)} style={{ background: '#00aaff', padding: '10px 20px', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white', fontWeight: 'bold' }}>
                        🤖 Auto (NowPayments) - ${netUsd.toFixed(2)}
                      </button>
                      <button onClick={() => approveCashoutManual(c.id)} style={{ background: '#00ff88', padding: '10px 20px', border: 'none', borderRadius: 5, cursor: 'pointer', color: '#0a0a2a', fontWeight: 'bold' }}>
                        ✅ Manual Approve - ${netUsd.toFixed(2)}
                      </button>
                      <button onClick={() => rejectCashout(c.id)} style={{ background: '#ff4444', padding: '10px 20px', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white', fontWeight: 'bold' }}>
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#1a1a3a', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00ff88' }}>{notificationStats.total || 0}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Total</div>
              </div>
              <div style={{ background: '#1a1a3a', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffa502' }}>{notificationStats.unread || 0}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Unread</div>
              </div>
              <div style={{ background: '#1a1a3a', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00ccff' }}>{notificationStats.read || 0}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Read</div>
              </div>
              <div style={{ background: '#1a1a3a', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00ccff' }}>{notificationStats.system || 0}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>System</div>
              </div>
              <div style={{ background: '#1a1a3a', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#aaa' }}>{notificationStats.user || 0}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>User</div>
              </div>
              <div style={{ background: '#1a1a3a', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #ffa502' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffa502' }}>{notificationStats.promo || 0}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Promo</div>
              </div>
              <div style={{ background: '#1a1a3a', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #9b59b6' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9b59b6' }}>{notificationStats.agent || 0}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Agent</div>
              </div>
            </div>
            <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, marginBottom: 20, border: '1px solid #ffa502' }}>
              <h3 style={{ color: '#ffa502' }}>Send System Notification</h3>
              <input type="text" placeholder="Title" value={systemNotificationTitle} onChange={e => setSystemNotificationTitle(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 10, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }} />
              <textarea placeholder="Message" value={systemNotificationMessage} onChange={e => setSystemNotificationMessage(e.target.value)} rows={3} style={{ width: '100%', padding: 10, marginBottom: 10, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }} />
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', marginBottom: 8 }}>
                  <input type="radio" name="sendToGroup" checked={sendToAllUsers === 'all_users'} onChange={() => setSendToAllUsers('all_users')} /> 
                  Send to all users
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa' }}>
                  <input type="radio" name="sendToGroup" checked={sendToAllUsers === 'all_agents'} onChange={() => setSendToAllUsers('all_agents')} /> 
                  Send to all agents only
                </label>
              </div>
              <button onClick={sendSystemNotification} disabled={notificationSending} style={{ marginTop: 10, padding: 10, background: '#00ff88', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', color: '#0a0a2a' }}>{notificationSending ? 'Sending...' : 'Send Announcement'}</button>
            </div>
            <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ color: '#ffa502', margin: 0 }}>All Notifications</h3>
                <select value={notificationFilter} onChange={e => setNotificationFilter(e.target.value)} style={{ padding: 8, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }}>
                  <option value="all">All</option>
                  <option value="system">System</option>
                  <option value="user">User</option>
                  <option value="unread">Unread</option>
                </select>
              </div>
              {allNotifications.map(n => {
                const badge = getNotificationBadge(n.type)
                return (
                  <div key={n.id} style={{ borderBottom: '1px solid #333', padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 5 }}>
                      <span style={{ background: badge.color, color: '#0d0d12', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', display: 'inline-block' }}>
                        {badge.label}
                      </span>
                      <strong style={{ color: '#ffa502' }}>{n.title}</strong>
                      <span style={{ color: '#888', fontSize: 11 }}>{getNotificationTypeLabel(n.type)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>{n.message}</div>
                    <div style={{ fontSize: 10, color: '#666', marginTop: 5 }}>
                      {new Date(n.created_at).toLocaleString()} 
                      {!n.read && <span style={{ color: '#00ff88', marginLeft: 10 }}>● Unread</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* AGENTS TAB */}
        {activeTab === 'agents' && (
          <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10 }}>
            
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid #333', paddingBottom: 10, flexWrap: 'wrap' }}>
              <button 
                onClick={() => setAgentSubTab('agents_list')}
                style={{ padding: '8px 16px', background: agentSubTab === 'agents_list' ? '#9b59b6' : 'transparent', border: 'none', borderRadius: 5, color: agentSubTab === 'agents_list' ? 'white' : '#aaa', cursor: 'pointer' }}
              >
                👥 Agents
              </button>
              <button 
                onClick={() => setAgentSubTab('requests')}
                style={{ padding: '8px 16px', background: agentSubTab === 'requests' ? '#9b59b6' : 'transparent', border: 'none', borderRadius: 5, color: agentSubTab === 'requests' ? 'white' : '#aaa', cursor: 'pointer' }}
              >
                📋 Code Requests {pendingAgentRequestsCount > 0 && `(${pendingAgentRequestsCount})`}
              </button>
              <button 
                onClick={() => { setAgentSubTab('withdrawals'); loadAgentWithdrawals(); }}
                style={{ padding: '8px 16px', background: agentSubTab === 'withdrawals' ? '#9b59b6' : 'transparent', border: 'none', borderRadius: 5, color: agentSubTab === 'withdrawals' ? 'white' : '#aaa', cursor: 'pointer' }}
              >
                💸 Withdrawals {pendingWithdrawalsCount > 0 && `(${pendingWithdrawalsCount})`}
              </button>
            </div>

            {agentSubTab === 'agents_list' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                  <h2 style={{ color: '#9b59b6', margin: 0 }}>🤝 Agent Management</h2>
                  <button onClick={() => { loadAgents(); }} style={{ padding: '8px 16px', background: '#333', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white' }}>🔄 Refresh</button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #9b59b6' }}>
                        <th style={{ textAlign: 'left', padding: 10, color: '#9b59b6' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: 10, color: '#9b59b6' }}>Email</th>
                        <th style={{ textAlign: 'center', padding: 10, color: '#9b59b6' }}>Tier</th>
                        <th style={{ textAlign: 'center', padding: 10, color: '#9b59b6' }}>Codes Sold</th>
                        <th style={{ textAlign: 'right', padding: 10, color: '#9b59b6' }}>Commission Balance</th>
                        <th style={{ textAlign: 'center', padding: 10, color: '#9b59b6' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map(agent => (
                        <tr key={agent.id} style={{ borderBottom: '1px solid #333' }}>
                          <td style={{ padding: 10, color: 'white' }}>{agent.name}</td>
                          <td style={{ padding: 10, color: '#aaa' }}>{agent.email}</td>
                          <td style={{ padding: 10, textAlign: 'center', color: '#00ff88' }}>{agent.agent_tier || 'agent'}</td>
                          <td style={{ padding: 10, textAlign: 'center', color: '#00ccff' }}>{agent.agent_total_codes_sold || 0}</td>
                          <td style={{ padding: 10, textAlign: 'right', color: '#ffa502', fontWeight: 'bold' }}>${(agent.agent_commission_balance || 0).toFixed(2)}</td>
                          <td style={{ padding: 10, textAlign: 'center' }}>
                            <button 
                              onClick={() => { setSelectedAgentUser(agent); setShowAgentModal(true); }} 
                              style={{ background: '#00ccff', border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', color: '#0a0a2a', marginRight: 5, fontSize: 11 }}
                            >
                              📦 Assign Codes
                            </button>
                            <button 
                              onClick={() => deactivateAgent(agent)} 
                              style={{ background: '#ff4444', border: 'none', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', color: 'white', fontSize: 11 }}
                            >
                              🚫 Remove
                            </button>
                          </td>
                         </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {agents.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>No agents yet. Activate a user as an agent from the Users tab.</p>
                )}
              </>
            )}

            {agentSubTab === 'requests' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ color: '#9b59b6', margin: 0 }}>📋 Agent Code Requests</h2>
                  <button onClick={() => { loadAgentRequests(); }} style={{ padding: '8px 16px', background: '#333', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white' }}>🔄 Refresh</button>
                </div>

                {agentRequests.filter(r => r.status === 'pending').length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>No pending code requests</p>
                ) : (
                  agentRequests.filter(r => r.status === 'pending').map(req => {
                    const agent = agents.find(a => a.id === req.agent_id)
                    return (
                      <div key={req.id} style={{ background: '#0a0a2a', padding: 20, borderRadius: 10, marginBottom: 15, border: '1px solid #9b59b6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div>
                            <strong style={{ color: '#00ff88', fontSize: 16 }}>{agent?.name || 'Unknown Agent'}</strong>
                            <span style={{ color: '#aaa', marginLeft: 10 }}>({agent?.email})</span>
                          </div>
                          <div style={{ color: '#ffa502', fontWeight: 'bold' }}>Code Request #{req.id.slice(0, 8)}</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 15 }}>
                          <div><span style={{ color: '#888' }}>📦 Quantity:</span> <span style={{ color: '#00ff88', fontWeight: 'bold' }}>{req.quantity}</span></div>
                          <div><span style={{ color: '#888' }}>💰 Value:</span> <span style={{ color: '#ffa502' }}>${(req.quantity * 500).toLocaleString()} BBD</span></div>
                          <div><span style={{ color: '#888' }}>🏷️ Tier:</span> <span style={{ color: '#00ccff' }}>{req.tier || 'consignment'}</span></div>
                          <div><span style={{ color: '#888' }}>📅 Requested:</span> <span style={{ color: '#aaa' }}>{new Date(req.created_at).toLocaleString()}</span></div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button 
                            onClick={() => approveAgentRequest(req.id)} 
                            disabled={processingRequest === req.id}
                            style={{ background: '#00ff88', padding: '10px 20px', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', color: '#0a0a2a' }}
                          >
                            ✅ Approve
                          </button>
                          <button 
                            onClick={() => rejectAgentRequest(req.id)} 
                            disabled={processingRequest === req.id}
                            style={{ background: '#ff4444', padding: '10px 20px', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white' }}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </>
            )}

            {agentSubTab === 'withdrawals' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ color: '#9b59b6', margin: 0 }}>💸 Agent Withdrawal Requests</h2>
                  <button onClick={() => { loadAgentWithdrawals(); }} style={{ padding: '8px 16px', background: '#333', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white' }}>🔄 Refresh</button>
                </div>

                {agentWithdrawals.filter(w => w.status === 'pending').length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>No pending withdrawal requests</p>
                ) : (
                  agentWithdrawals.filter(w => w.status === 'pending').map(w => (
                    <div key={w.id} style={{ background: '#0a0a2a', padding: 20, borderRadius: 10, marginBottom: 15, border: '1px solid #ffa502' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div>
                          <strong style={{ color: 'white', fontSize: 16 }}>{w.agent?.name || 'Unknown Agent'}</strong>
                          <span style={{ color: '#aaa', marginLeft: 10 }}>({w.agent?.email})</span>
                        </div>
                        <div style={{ color: '#ffa502', fontWeight: 'bold', fontSize: 24 }}>${w.amount.toFixed(2)}</div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 15 }}>
                        <div><span style={{ color: '#888' }}>💸 Method:</span> <span style={{ color: '#00ccff', textTransform: 'capitalize' }}>{w.method}</span></div>
                        <div><span style={{ color: '#888' }}>📅 Requested:</span> <span style={{ color: '#aaa' }}>{new Date(w.requested_at).toLocaleString()}</span></div>
                        {w.wallet_address && (
                          <div><span style={{ color: '#888' }}>🏦 Wallet:</span> <code style={{ color: '#00ff88', fontSize: 11 }}>{w.wallet_address.substring(0, 20)}...</code></div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => processAgentWithdrawal(w.id, 'approve', 'points')}
                          style={{ background: '#00ff88', padding: '10px 20px', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', color: '#0a0a2a' }}
                        >
                          ✅ Approve (Points)
                        </button>
                        {w.method === 'crypto' && (
                          <button 
                            onClick={() => processAgentWithdrawal(w.id, 'approve', 'crypto')}
                            style={{ background: '#00ccff', padding: '10px 20px', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', color: '#0a0a2a' }}
                          >
                            💎 Approve (Crypto)
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            const reason = prompt('Enter reason for rejection:')
                            if (reason) processAgentWithdrawal(w.id, 'reject', null, reason)
                          }}
                          style={{ background: '#ff4444', padding: '10px 20px', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white' }}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {agentWithdrawals.filter(w => w.status !== 'pending').length > 0 && (
                  <>
                    <h3 style={{ color: '#9b59b6', marginTop: 30, marginBottom: 15 }}>📜 Withdrawal History</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #333' }}>
                            <th style={{ textAlign: 'left', padding: 10, color: '#888' }}>Agent</th>
                            <th style={{ textAlign: 'right', padding: 10, color: '#888' }}>Amount</th>
                            <th style={{ textAlign: 'center', padding: 10, color: '#888' }}>Method</th>
                            <th style={{ textAlign: 'center', padding: 10, color: '#888' }}>Status</th>
                            <th style={{ textAlign: 'center', padding: 10, color: '#888' }}>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentWithdrawals.filter(w => w.status !== 'pending').map(w => (
                            <tr key={w.id} style={{ borderBottom: '1px solid #333' }}>
                              <td style={{ padding: 10, color: 'white' }}>{w.agent?.name || 'Unknown'}</td>
                              <td style={{ padding: 10, textAlign: 'right', color: '#ffa502' }}>${w.amount.toFixed(2)}</td>
                              <td style={{ padding: 10, textAlign: 'center', color: '#00ccff', textTransform: 'capitalize' }}>{w.method}</td>
                              <td style={{ padding: 10, textAlign: 'center' }}>
                                {w.status === 'approved' && <span style={{ color: '#00ccff' }}>📋 Approved</span>}
                                {w.status === 'completed' && <span style={{ color: '#00ff88' }}>✅ Completed</span>}
                                {w.status === 'rejected' && <span style={{ color: '#ff4444' }}>❌ Rejected</span>}
                              </td>
                              <td style={{ padding: 10, textAlign: 'center', color: '#aaa' }}>{new Date(w.processed_at || w.requested_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}

            {showAgentModal && selectedAgentUser && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#1a1a3a', padding: 30, borderRadius: 10, maxWidth: 500, width: '90%', border: '2px solid #ffa502' }}>
                  <h2 style={{ color: '#ffa502', marginBottom: 20 }}>Assign Codes to {selectedAgentUser.name}</h2>
                  
                  <div style={{ marginBottom: 15 }}>
                    <label style={{ color: '#aaa', display: 'block', marginBottom: 5 }}>Quantity (1-50 codes)</label>
                    <input 
                      type="number" 
                      value={agentCodeQuantity} 
                      onChange={(e) => setAgentCodeQuantity(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))} 
                      min="1" max="50" 
                      style={{ width: '100%', padding: 10, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }} 
                    />
                    <p style={{ color: '#666', fontSize: 11, marginTop: 5 }}>Limit 1-50 codes per agent (${(agentCodeQuantity * 500).toLocaleString()} BBD value)</p>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ color: '#aaa', display: 'block', marginBottom: 5 }}>Purchase Tier</label>
                    <select 
                      value={agentPurchaseTier} 
                      onChange={(e) => setAgentPurchaseTier(e.target.value)} 
                      style={{ width: '100%', padding: 10, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }}
                    >
                      <option value="consignment">Consignment (2.5% commission, pay after sale)</option>
                      <option value="prepaid">Pre-paid (5% commission, pay upfront)</option>
                    </select>
                  </div>

                  <div style={{ background: '#0a0a2a', padding: 15, borderRadius: 10, marginBottom: 20 }}>
                    <p style={{ color: '#aaa', marginBottom: 5 }}>Summary:</p>
                    <p style={{ color: '#00ff88' }}>Codes: {agentCodeQuantity}</p>
                    <p style={{ color: '#ffa502' }}>Total Value: ${(agentCodeQuantity * 500).toLocaleString()} BBD</p>
                    <p style={{ color: '#00ccff' }}>Agent Cost: ${agentPurchaseTier === 'prepaid' ? (agentCodeQuantity * 475).toLocaleString() : (agentCodeQuantity * 487.50).toLocaleString()} BBD</p>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={assignCodesToAgent} style={{ flex: 1, padding: 12, background: '#00ff88', border: 'none', borderRadius: 5, fontWeight: 'bold', cursor: 'pointer' }}>Assign Codes</button>
                    <button onClick={() => { setShowAgentModal(false); setSelectedAgentUser(null) }} style={{ flex: 1, padding: 12, background: '#333', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* BONUS POOL SETTINGS (Phase C — NEW) */}
            <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, border: '1px solid #00ff88' }}>
              <h2 style={{ color: '#00ff88', marginBottom: 20 }}>💰 Bonus Pool Settings</h2>

              <div style={{ background: '#0a0a2a', padding: 15, borderRadius: 10, marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>Current Pool Balance</div>
                  <div style={{ color: '#00ff88', fontSize: 24, fontWeight: 'bold' }}>
                    {bonusPoolBalance.toLocaleString()} pts
                  </div>
                  <div style={{ color: '#666', fontSize: 11 }}>
                    (${(bonusPoolBalance / 200).toFixed(2)} USD)
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>Active Users</div>
                  <div style={{ color: '#00ccff', fontSize: 24, fontWeight: 'bold' }}>
                    {activeUserCount}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>Daily Rate per User</div>
                  <div style={{ color: '#ffa502', fontSize: 24, fontWeight: 'bold' }}>
                    {activeUserCount > 0 && bonusDaysToDrain > 0
                      ? Math.floor(bonusPoolBalance / bonusDaysToDrain / activeUserCount).toLocaleString()
                      : 0} pts
                  </div>
                  <div style={{ color: '#666', fontSize: 11 }}>
                    (${activeUserCount > 0 && bonusDaysToDrain > 0
                      ? (Math.floor(bonusPoolBalance / bonusDaysToDrain / activeUserCount) / 200).toFixed(4)
                      : '0.0000'} USD)
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: '#aaa', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>
                  Overhead / Admin Fees %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={bonusOverheadPercent}
                  onChange={(e) => setBonusOverheadPercent(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: 10,
                    background: '#0a0a2a',
                    color: 'white',
                    border: '1px solid #00ff88',
                    borderRadius: 5,
                    fontSize: 14
                  }}
                />
                <p style={{ color: '#666', fontSize: 11, marginTop: 4, marginBottom: 0 }}>
                  Percentage of each raffle's platform share sent to Admin Fees. Takes effect on <strong>future redemptions only</strong> — existing pool balance is unaffected.
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: '#aaa', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>
                  Days to Drain (1-365)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  step="1"
                  value={bonusDaysToDrain}
                  onChange={(e) => setBonusDaysToDrain(parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%',
                    padding: 10,
                    background: '#0a0a2a',
                    color: 'white',
                    border: '1px solid #00ff88',
                    borderRadius: 5,
                    fontSize: 14
                  }}
                />
                <p style={{ color: '#666', fontSize: 11, marginTop: 4, marginBottom: 0 }}>
                  The Bonus Pool divides over this many days. Larger = smaller daily payouts, longer drain. Applies at the <strong>next 00:00 UTC payout</strong>.
                </p>
              </div>

              <div style={{ background: '#0a0a2a', padding: 12, borderRadius: 8, marginBottom: 20, border: '1px dashed #00ff88' }}>
                <div style={{ color: '#00ff88', fontSize: 12, marginBottom: 6, fontWeight: 'bold' }}>
                  📊 Preview (current settings)
                </div>
                <div style={{ color: '#aaa', fontSize: 12, lineHeight: 1.6 }}>
                  With <strong style={{ color: '#00ccff' }}>{activeUserCount}</strong> active users and a pool of <strong style={{ color: '#00ff88' }}>{bonusPoolBalance.toLocaleString()} pts</strong>:
                  <br />
                  Each user gets <strong style={{ color: '#ffa502' }}>
                    {activeUserCount > 0 && bonusDaysToDrain > 0
                      ? Math.floor(bonusPoolBalance / bonusDaysToDrain / activeUserCount).toLocaleString()
                      : 0} pts / day
                  </strong>.
                  <br />
                  Full pool drains in <strong style={{ color: '#ffa502' }}>~{bonusDaysToDrain} days</strong> if no new revenue arrives.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={saveBonusSettings}
                  disabled={bonusSettingsSaving}
                  style={{
                    padding: '10px 24px',
                    background: bonusSettingsSaving ? '#555' : '#00ff88',
                    border: 'none',
                    borderRadius: 5,
                    fontWeight: 'bold',
                    cursor: bonusSettingsSaving ? 'not-allowed' : 'pointer',
                    color: '#0a0a2a',
                    fontSize: 14
                  }}
                >
                  {bonusSettingsSaving ? '💾 Saving...' : '💾 Save Settings'}
                </button>
                {bonusSettingsMessage && (
                  <span style={{
                    color: bonusSettingsMessage.type === 'success' ? '#00ff88' : '#ff4444',
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}>
                    {bonusSettingsMessage.text}
                  </span>
                )}
              </div>
            </div>

            <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, border: '1px solid #ffa502' }}>
              <h2 style={{ color: '#ffa502', marginBottom: 20 }}>🛠️ System Controls</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <button onClick={simulateSignups} style={{ padding: 10, background: '#00ccff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', color: '#0a0a2a' }}>🤖 Simulate Signups</button>
                <button onClick={handleManualMatrixCompletion} style={{ padding: 10, background: '#9b59b6', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', color: 'white' }}>🎯 Manual Matrix Completion</button>
                <button onClick={resetSystem} style={{ padding: 10, background: '#ff4444', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', color: 'white' }}>⚠️ Reset Entire System</button>
                <button onClick={loadAdminData} style={{ padding: 10, background: '#ffa502', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', color: '#0a0a2a' }}>🔄 Refresh All Data</button>
              </div>
            </div>
            <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, border: '1px solid #ffa502' }}>
              <h2 style={{ color: '#ffa502', marginBottom: 20 }}>📊 Quick Stats</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 }}>
                <div><span style={{ color: '#888' }}>Total Users:</span> <span style={{ color: '#00ff88', fontWeight: 'bold' }}>{stats.totalUsers}</span></div>
                <div><span style={{ color: '#888' }}>Recovery Fund:</span> <span style={{ color: '#00ff88', fontWeight: 'bold' }}>{formatNumber(stats.recoveryFund)}</span></div>
                <div><span style={{ color: '#888' }}>Admin Fees:</span> <span style={{ color: '#00ccff', fontWeight: 'bold' }}>{formatNumber(stats.adminFees)}</span></div>
                <div><span style={{ color: '#888' }}>Pending Payments:</span> <span style={{ color: pendingPaymentsCount > 0 ? '#ff4444' : '#00ff88', fontWeight: 'bold' }}>{pendingPaymentsCount}</span></div>
                <div><span style={{ color: '#888' }}>Pending Cashouts:</span> <span style={{ color: pendingCashoutsCount > 0 ? '#ff4444' : '#00ff88', fontWeight: 'bold' }}>{pendingCashoutsCount}</span></div>
                <div><span style={{ color: '#888' }}>Unread Notifications:</span> <span style={{ color: notificationStats.unread > 0 ? '#ff4444' : '#00ff88', fontWeight: 'bold' }}>{notificationStats.unread}</span></div>
                <div><span style={{ color: '#888' }}>Active Rules:</span> <span style={{ color: '#00ccff', fontWeight: 'bold' }}>{completionRules.filter(r => r.is_active).length}</span></div>
                <div><span style={{ color: '#888' }}>Active Promotions:</span> <span style={{ color: '#ffa502', fontWeight: 'bold' }}>{promotions.filter(p => p.is_active && new Date(p.end_date) > new Date()).length}</span></div>
              </div>
            </div>
            <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, border: '1px solid #ffa502' }}>
              <h3 style={{ color: '#ffa502', marginBottom: 15 }}>💰 Crypto Wallet Addresses (TRC20)</h3>
              <p style={{ color: '#aaa', fontSize: 12, marginBottom: 15 }}>Users will see these addresses when making manual crypto payments.</p>
              {cryptoWallets.map((wallet, index) => (
                <div key={wallet.id} style={{ background: '#0a0a2a', padding: 15, borderRadius: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                    <input type="text" value={wallet.address} onChange={(e) => updateWalletAddress(wallet.id, e.target.value)} style={{ flex: 2, padding: 8, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }} placeholder="Wallet Address (TRC20)" />
                    <input type="text" value={wallet.label || ''} onChange={(e) => updateWalletLabel(wallet.id, e.target.value)} style={{ flex: 1, padding: 8, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }} placeholder="Label (e.g., Main Wallet)" />
                    <button onClick={() => toggleWalletActive(wallet.id, !wallet.is_active)} style={{ padding: '8px 16px', background: wallet.is_active ? '#00ff88' : '#555', border: 'none', borderRadius: 5, cursor: 'pointer', color: wallet.is_active ? '#0a0a2a' : 'white' }}>{wallet.is_active ? 'Active' : 'Inactive'}</button>
                    {index > 0 && <button onClick={() => deleteWallet(wallet.id)} style={{ padding: '8px 16px', background: '#ff4444', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white' }}>Delete</button>}
                  </div>
                </div>
              ))}
              {cryptoWallets.length < 3 && (
                <button onClick={addWallet} style={{ padding: '10px 20px', background: '#00ccff', border: 'none', borderRadius: 5, cursor: 'pointer', color: '#0a0a2a', fontWeight: 'bold' }}>+ Add Wallet Address</button>
              )}
            </div>
            <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, border: '1px solid #ffa502' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <h2 style={{ color: '#ffa502', margin: 0 }}>📋 Completion Rules</h2>
                <button onClick={() => setShowCreateRuleModal(true)} style={{ padding: 8, background: '#00ff88', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', color: '#0a0a2a' }}>➕ Create Rule</button>
              </div>
              <button onClick={testCompletionRules} style={{ marginBottom: 10, padding: 8, background: '#00ccff', border: 'none', borderRadius: 5, cursor: 'pointer', color: '#0a0a2a', fontWeight: 'bold' }}>🔍 Test Rules Against Current Matrix</button>
              {ruleTestResult && (
                <pre style={{ background: '#0a0a2a', padding: 10, marginTop: 10, overflowX: 'auto', color: '#aaa', fontSize: 12, borderRadius: 5 }}>{JSON.stringify(ruleTestResult, null, 2)}</pre>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', marginTop: 10, borderCollapse: 'collapse', minWidth: 500 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ffa502' }}>
                      <th style={{ textAlign: 'left', padding: 10, color: '#ffa502' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: 10, color: '#ffa502' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: 10, color: '#ffa502' }}>Threshold</th>
                      <th style={{ textAlign: 'center', padding: 10, color: '#ffa502' }}>Active</th>
                      <th style={{ textAlign: 'center', padding: 10, color: '#ffa502' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completionRules.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #333' }}>
                        <td style={{ padding: 10, color: 'white' }}>{r.rule_name}</td>
                        <td style={{ padding: 10, color: '#aaa' }}>{r.rule_type}</td>
                        <td style={{ padding: 10, color: '#00ff88' }}>{r.threshold_value}</td>
                        <td style={{ padding: 10, textAlign: 'center' }}>
                          <button onClick={() => toggleRuleActive(r.id, !r.is_active)} style={{ background: r.is_active ? '#00ff88' : '#555', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontWeight: 'bold', color: r.is_active ? '#0a0a2a' : 'white' }}>{r.is_active ? 'Active' : 'Inactive'}</button>
                        </td>
                        <td style={{ padding: 10, textAlign: 'center' }}>
                          <button onClick={() => deleteRule(r.id)} style={{ background: '#ff4444', border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', color: 'white' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 20 }}>
                <h3 style={{ color: '#ffa502', marginBottom: 10 }}>📜 Completion History</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #ffa502' }}>
                        <th style={{ textAlign: 'left', padding: 10, color: '#ffa502' }}>Date</th>
                        <th style={{ textAlign: 'left', padding: 10, color: '#ffa502' }}>Matrix</th>
                        <th style={{ textAlign: 'left', padding: 10, color: '#ffa502' }}>Trigger</th>
                        <th style={{ textAlign: 'right', padding: 10, color: '#ffa502' }}>Spots</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completionLog.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #333' }}>
                          <td style={{ padding: 10, color: '#aaa' }}>{new Date(l.completed_at).toLocaleDateString()}</td>
                          <td style={{ padding: 10, color: 'white' }}>#{l.matrix_number}</td>
                          <td style={{ padding: 10, color: '#00ccff' }}>{l.triggered_by_rule_name || 'Manual'}</td>
                          <td style={{ padding: 10, textAlign: 'right', color: '#00ff88' }}>{l.spots_filled}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* PROMOTIONS SECTION */}
            <div style={{ background: '#1a1a3a', padding: 20, borderRadius: 10, border: '1px solid #ffa502' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <h2 style={{ color: '#ffa502', margin: 0 }}>🎲 Promotions & Raffles</h2>
                <button onClick={() => { setEditingPromotion(null); setNewPromotion({ title: '', description: '', prize_description: '', prize_points: 0, entry_cost: 500, start_date: '', end_date: '', max_entries_per_user: 1, is_active: true, auto_draw: true, allow_non_member_entry: false, max_tickets_per_agent: 50 }); setShowCreatePromotionModal(true) }} style={{ padding: 8, background: '#00ff88', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', color: '#0a0a2a' }}>➕ Create Promotion</button>
              </div>

              {pendingRaffleRequestsCount > 0 && (
                <div style={{ background: '#0a0a2a', border: '1px solid #9b59b6', borderRadius: 10, padding: 15, marginBottom: 15 }}>
                  <h3 style={{ color: '#9b59b6', margin: '0 0 15px 0', fontSize: 14 }}>📋 Pending Agent Ticket Requests ({pendingRaffleRequestsCount})</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {raffleTicketRequests.map(req => (
                      <div key={req.id} style={{ background: '#1a1a3a', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <div style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>{req.agent?.name || 'Unknown Agent'} — {req.quantity} tickets</div>
                          <div style={{ color: '#aaa', fontSize: 11 }}>{req.promotion?.title} · Requested {new Date(req.created_at).toLocaleDateString()}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => approveRaffleTicketRequest(req.id)} disabled={processingRaffleRequest === req.id} style={{ padding: '6px 12px', background: '#00ff88', border: 'none', borderRadius: 5, color: '#0a0a2a', fontWeight: 'bold', cursor: 'pointer', fontSize: 12 }}>{processingRaffleRequest === req.id ? '...' : '✅ Approve'}</button>
                          <button onClick={() => rejectRaffleTicketRequest(req.id)} disabled={processingRaffleRequest === req.id} style={{ padding: '6px 12px', background: '#ff4444', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', fontSize: 12 }}>❌ Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {promotions.length === 0 ? (
                <p style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>No promotions created yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  {promotions.map(promo => {
                    const isActive = promo.is_active && new Date(promo.end_date) > new Date() && (!promo.winner_id)
                    const hasStarted = !promo.start_date || new Date(promo.start_date) <= new Date()
                    const showDrawButton = promo.is_active && hasStarted && !promo.winner_id
                    const allowsNonMember = promo.allow_non_member_entry === true || promo.allow_agent_distribution === true
                    return (
                      <div key={promo.id} style={{ background: '#0a0a2a', padding: 15, borderRadius: 10, border: '1px solid #333' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ color: isActive ? '#00ff88' : '#888', marginBottom: 5 }}>{promo.title}</h3>
                            <p style={{ color: '#aaa', fontSize: 12 }}>{promo.description || 'No description'}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15, marginTop: 10 }}>
                              <span style={{ color: '#888', fontSize: 11 }}>🏆 Prize: <span style={{ color: '#ffa502' }}>{promo.prize_description}</span></span>
                              {promo.prize_points > 0 && <span style={{ color: '#888', fontSize: 11 }}>💎 Points: <span style={{ color: '#00ff88' }}>{formatNumber(promo.prize_points)}</span></span>}
                              <span style={{ color: '#888', fontSize: 11 }}>💰 Entry: <span style={{ color: '#00ff88' }}>{formatNumber(promo.entry_cost)} points</span></span>
                              <span style={{ color: '#888', fontSize: 11 }}>📊 Member Entries: <span style={{ color: '#00ccff' }}>{promo.total_entries || 0}</span></span>
{promo.redeemed_tickets_count > 0 && (
  <span style={{ color: '#888', fontSize: 11 }}>🎟️ Redeemed Tickets: <span style={{ color: '#9b59b6' }}>{promo.redeemed_tickets_count}</span></span>
)}
{promo.redeemed_tickets_count > 0 && (
  <span style={{ color: '#888', fontSize: 11 }}>🎲 Total Pool: <span style={{ color: '#ffa502', fontWeight: 'bold' }}>{(promo.total_entries || 0) + promo.redeemed_tickets_count}</span></span>
)}
                              {promo.start_date && <span style={{ color: '#888', fontSize: 11 }}>📅 Starts: <span style={{ color: '#ffa502' }}>{UTCToLocal(promo.start_date)}</span></span>}
                              <span style={{ color: '#888', fontSize: 11 }}>⏰ Ends: <span style={{ color: '#ff6666' }}>{UTCToLocal(promo.end_date)}</span></span>
                              <span style={{ color: '#888', fontSize: 11 }}>🤖 Auto Draw: <span style={{ color: promo.auto_draw !== false ? '#00ff88' : '#ff6666' }}>{promo.auto_draw !== false ? 'ON' : 'OFF'}</span></span>
                              <span style={{ color: '#888', fontSize: 11 }}>Status: <span style={{ color: isActive ? (hasStarted ? '#00ff88' : '#ffa502') : '#888' }}>{promo.winner_id ? 'Ended - Winner Drawn' : (isActive ? (hasStarted ? 'Active' : 'Upcoming') : 'Ended')}</span></span>
                              {allowsNonMember && (
                                <span style={{ color: '#9b59b6', fontSize: 11, fontWeight: 'bold' }}>🎟️ Non-Member Entry ON</span>
                              )}
                              {promo.winner && (
                                <span style={{ color: '#888', fontSize: 11 }}>🏆 Winner: <span style={{ color: '#ffa502' }}>{promo.winner.name || promo.winner.alias}</span>{promo.winner.ticket_code && <span style={{ color: '#9b59b6' }}> (Ticket {promo.winner.ticket_code})</span>}</span>
                              )}
                              {promo.winner_id && !promo.winner && (
                                <span style={{ color: '#888', fontSize: 11 }}>🏆 Winner ID: <span style={{ color: '#ffa502' }}>{promo.winner_id}</span></span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {allowsNonMember && (
                              <button onClick={() => { setGenerateTicketsRaffle(promo); setGenerateTicketsQuantity(50); setShowGenerateTicketsModal(true); }} style={{ padding: '6px 12px', background: '#9b59b6', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white', fontSize: 12, fontWeight: 'bold' }}>🎟️ Generate Tickets</button>
                            )}
                            {showDrawButton && <button onClick={() => drawWinner(promo.id)} style={{ padding: '6px 12px', background: '#9b59b6', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white', fontSize: 12 }}>Draw Winner</button>}
                            <button onClick={() => { setEditingPromotion(promo); setNewPromotion({ ...promo, start_date: promo.start_date || '' }); setShowCreatePromotionModal(true) }} style={{ padding: '6px 12px', background: '#00ccff', border: 'none', borderRadius: 5, cursor: 'pointer', color: '#0a0a2a', fontSize: 12 }}>Edit</button>
                            <button onClick={() => deletePromotion(promo.id)} style={{ padding: '6px 12px', background: '#ff4444', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white', fontSize: 12 }}>Delete</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {showTransferModal && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a3a', padding: 30, borderRadius: 10, maxWidth: 500, width: '90%', border: '2px solid #ffa502' }}>
            <h2 style={{ color: '#ffa502' }}>Transfer Points to {selectedUser.name}</h2>
            <select value={transferFrom} onChange={e => setTransferFrom(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 10, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }}>
              <option value="admin_fees">Admin Fees ({formatNumber(stats.adminFees)})</option>
              <option value="recovery_fund">Recovery Fund ({formatNumber(stats.recoveryFund)})</option>
            </select>
            <input type="number" placeholder="Amount" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 10, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }} />
            <input type="text" placeholder="Description" value={transferDescription} onChange={e => setTransferDescription(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 20, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5 }} />
            <button onClick={handleTransfer} disabled={transferLoading} style={{ width: '100%', padding: 10, background: '#ffa502', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', color: '#0a0a2a' }}>{transferLoading ? 'Processing...' : 'Transfer'}</button>
            <button onClick={() => setShowTransferModal(false)} style={{ width: '100%', marginTop: 10, padding: 10, background: '#333', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Create/Edit Rule Modal */}
      {showCreateRuleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a3a', padding: 30, borderRadius: 10, maxWidth: 500, width: '90%', border: '2px solid #00ff88' }}>
            <h2 style={{ color: '#00ff88' }}>Create Completion Rule</h2>
            <input type="text" placeholder="Rule Name" value={newRule.rule_name} onChange={e => setNewRule({...newRule, rule_name: e.target.value})} style={{ width: '100%', padding: 10, marginBottom: 10, background: '#0a0a2a', color: 'white', border: '1px solid #00ff88', borderRadius: 5 }} />
            <select value={newRule.rule_type} onChange={e => setNewRule({...newRule, rule_type: e.target.value})} style={{ width: '100%', padding: 10, marginBottom: 10, background: '#0a0a2a', color: 'white', border: '1px solid #00ff88', borderRadius: 5 }}>
              <option value="spots">Spots Filled</option>
              <option value="time_days">Matrix Age (Days)</option>
              <option value="min_spots">Minimum Spots</option>
            </select>
            <input type="number" placeholder="Threshold" value={newRule.threshold_value} onChange={e => setNewRule({...newRule, threshold_value: parseInt(e.target.value)})} style={{ width: '100%', padding: 10, marginBottom: 10, background: '#0a0a2a', color: 'white', border: '1px solid #00ff88', borderRadius: 5 }} />
            <input type="number" placeholder="Priority" value={newRule.priority} onChange={e => setNewRule({...newRule, priority: parseInt(e.target.value)})} style={{ width: '100%', padding: 10, marginBottom: 10, background: '#0a0a2a', color: 'white', border: '1px solid #00ff88', borderRadius: 5 }} />
            <textarea placeholder="Description" value={newRule.description} onChange={e => setNewRule({...newRule, description: e.target.value})} rows={2} style={{ width: '100%', padding: 10, marginBottom: 20, background: '#0a0a2a', color: 'white', border: '1px solid #00ff88', borderRadius: 5 }} />
            <button onClick={createNewRule} style={{ width: '100%', padding: 10, background: '#00ff88', border: 'none', borderRadius: 5, cursor: 'pointer', marginBottom: 10, fontWeight: 'bold', color: '#0a0a2a' }}>Create</button>
            <button onClick={() => setShowCreateRuleModal(false)} style={{ width: '100%', padding: 10, background: '#333', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Create/Edit Promotion Modal */}
      {showCreatePromotionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a3a', borderRadius: 10, maxWidth: 650, width: '90%', border: '2px solid #ffa502', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
            <div style={{ padding: '20px 20px 10px 20px', borderBottom: '1px solid #333' }}>
              <h2 style={{ color: '#ffa502', margin: 0 }}>{editingPromotion ? '✏️ Edit Promotion' : '🎲 Create Promotion'}</h2>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <input type="text" placeholder="Title *" value={newPromotion.title} onChange={e => setNewPromotion({...newPromotion, title: e.target.value})} style={{ width: '100%', padding: 10, marginBottom: 12, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5, boxSizing: 'border-box' }} />
              <textarea placeholder="Description (optional)" value={newPromotion.description} onChange={e => setNewPromotion({...newPromotion, description: e.target.value})} rows={2} style={{ width: '100%', padding: 10, marginBottom: 12, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5, boxSizing: 'border-box', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <input type="text" placeholder="Prize Description *" value={newPromotion.prize_description} onChange={e => setNewPromotion({...newPromotion, prize_description: e.target.value})} style={{ flex: 2, padding: 10, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5, boxSizing: 'border-box' }} />
                <input type="number" placeholder="Prize Points" value={newPromotion.prize_points} onChange={e => setNewPromotion({...newPromotion, prize_points: parseInt(e.target.value) || 0})} style={{ flex: 1, padding: 10, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <input type="number" placeholder="Entry Cost (points) *" value={newPromotion.entry_cost} onChange={e => setNewPromotion({...newPromotion, entry_cost: parseInt(e.target.value)})} style={{ flex: 1, padding: 10, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5, boxSizing: 'border-box' }} />
                <input type="number" placeholder="Max Entries Per User" value={newPromotion.max_entries_per_user} onChange={e => setNewPromotion({...newPromotion, max_entries_per_user: parseInt(e.target.value)})} style={{ flex: 1, padding: 10, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 11, marginBottom: 4 }}>📅 Start Date (optional)</label>
                  <input type="datetime-local" value={formatDateForInput(newPromotion.start_date)} onChange={e => setNewPromotion({...newPromotion, start_date: e.target.value})} style={{ width: '100%', padding: 8, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5, boxSizing: 'border-box', colorScheme: 'dark' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', color: '#888', fontSize: 11, marginBottom: 4 }}>⏰ End Date *</label>
                  <input type="datetime-local" value={formatDateForInput(newPromotion.end_date)} onChange={e => setNewPromotion({...newPromotion, end_date: e.target.value})} style={{ width: '100%', padding: 8, background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: 5, boxSizing: 'border-box', colorScheme: 'dark' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', cursor: 'pointer' }}><input type="checkbox" checked={newPromotion.auto_draw} onChange={e => setNewPromotion({...newPromotion, auto_draw: e.target.checked})} /> 🤖 Auto Draw Winner</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', cursor: 'pointer' }}><input type="checkbox" checked={newPromotion.is_active} onChange={e => setNewPromotion({...newPromotion, is_active: e.target.checked})} /> ✅ Active</label>
              </div>
              {newPromotion.auto_draw && <p style={{ color: '#666', fontSize: 10, marginTop: -8, marginBottom: 16, paddingLeft: 28 }}>Winner will be automatically drawn when promotion ends</p>}
              {!newPromotion.auto_draw && <p style={{ color: '#ffa502', fontSize: 10, marginTop: -8, marginBottom: 16, paddingLeft: 28 }}>Manual draw required - use "Draw Winner" button after promotion ends</p>}

              <div style={{
                background: '#0a0a2a',
                padding: 15,
                borderRadius: 8,
                border: '1px solid #9b59b6',
                marginBottom: 16
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#9b59b6',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: 13
                }}>
                  <input
                    type="checkbox"
                    checked={newPromotion.allow_non_member_entry || false}
                    onChange={e => setNewPromotion({...newPromotion, allow_non_member_entry: e.target.checked})}
                  />
                  🤝 Allow non-members to enter via agents
                </label>

                {newPromotion.allow_non_member_entry && (
                  <div style={{ marginTop: 10, padding: 10, background: '#1a1a3a', borderRadius: 6 }}>
                    <p style={{ color: '#aaa', fontSize: 12, margin: '0 0 4px 0' }}>
                      <strong style={{ color: '#ffa502' }}>Ticket price:</strong> Same as entry cost ({newPromotion.entry_cost} pts = ${((newPromotion.entry_cost || 0) / 200).toFixed(2)} USD)
                    </p>
                    <p style={{ color: '#aaa', fontSize: 12, margin: '4px 0' }}>
                      <strong style={{ color: '#00ff88' }}>Agent commission:</strong> {Math.max(Math.floor((newPromotion.entry_cost || 0) * 0.10), 100)} pts (${(Math.max(Math.floor((newPromotion.entry_cost || 0) * 0.10), 100) / 200).toFixed(2)} USD) per ticket
                    </p>
                    <p style={{ color: '#666', fontSize: 11, margin: '6px 0 0 0' }}>
                      💡 Non-member winners with points prizes are auto-credited when they sign up with the same email.
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button onClick={editingPromotion ? () => updatePromotion(editingPromotion.id, newPromotion) : createPromotion} style={{ flex: 1, padding: 12, background: '#ffa502', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold', color: '#0a0a2a', fontSize: 14 }}>{editingPromotion ? '💾 Update Promotion' : '✨ Create Promotion'}</button>
                <button onClick={() => { setShowCreatePromotionModal(false); setEditingPromotion(null) }} style={{ flex: 1, padding: 12, background: '#333', border: 'none', borderRadius: 5, cursor: 'pointer', color: 'white', fontSize: 14 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Raffle Tickets Modal */}
      {showGenerateTicketsModal && generateTicketsRaffle && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a3a', padding: 30, borderRadius: 10, maxWidth: 420, width: '90%', border: '2px solid #9b59b6' }}>
            <h2 style={{ color: '#9b59b6', marginBottom: 10 }}>🎟️ Generate Tickets</h2>
            <p style={{ color: 'white', marginBottom: 20 }}><strong>{generateTicketsRaffle.title}</strong></p>

            <div style={{ background: '#0a0a2a', padding: 15, borderRadius: 8, marginBottom: 20 }}>
              <p style={{ color: '#aaa', fontSize: 12, margin: '4px 0' }}>
                Ticket Price: <span style={{ color: '#ffa502' }}>{generateTicketsRaffle.entry_cost} pts</span> = ${((generateTicketsRaffle.entry_cost || 0) / 200).toFixed(2)} USD
              </p>
              <p style={{ color: '#aaa', fontSize: 12, margin: '4px 0' }}>
                Commission: <span style={{ color: '#00ff88' }}>{Math.max(Math.floor((generateTicketsRaffle.entry_cost || 0) * 0.10), 100)} pts</span> = ${(Math.max(Math.floor((generateTicketsRaffle.entry_cost || 0) * 0.10), 100) / 200).toFixed(2)} USD
              </p>
            </div>

            <label style={{ display: 'block', color: '#aaa', fontSize: 12, marginBottom: 5 }}>How many tickets to generate?</label>
            <input
              type="number"
              min="1"
              max="100000"
              value={generateTicketsQuantity}
              onChange={e => setGenerateTicketsQuantity(parseInt(e.target.value) || 1)}
              style={{ width: '100%', padding: 10, background: '#0a0a2a', color: 'white', border: '1px solid #9b59b6', borderRadius: 5, marginBottom: 20, boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={generateTicketsForRaffle} disabled={generateTicketsLoading} style={{ flex: 1, padding: 12, background: generateTicketsLoading ? '#555' : '#9b59b6', border: 'none', borderRadius: 5, color: 'white', fontWeight: 'bold', cursor: generateTicketsLoading ? 'not-allowed' : 'pointer' }}>
                {generateTicketsLoading ? 'Generating...' : 'Generate'}
              </button>
              <button onClick={() => { setShowGenerateTicketsModal(false); setGenerateTicketsRaffle(null) }} style={{ flex: 1, padding: 12, background: '#333', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Spot Details Modal */}
      {showSpotModal && selectedSpotDetails && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a3a', padding: 30, borderRadius: 20, maxWidth: 500, width: '90%', border: `2px solid ${getStatusColor(selectedSpotDetails.status)}`, position: 'relative' }}>
            <button onClick={() => setShowSpotModal(false)} style={{ position: 'absolute', top: 15, right: 15, background: 'transparent', border: 'none', color: '#888', fontSize: 24, cursor: 'pointer' }}>✕</button>
            <h2 style={{ color: getStatusColor(selectedSpotDetails.status), marginBottom: 20 }}>📌 Position {selectedSpotDetails.position}</h2>
            <div style={{ marginBottom: 15 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: '#888' }}>Level:</span><span style={{ color: '#00ff88' }}>{selectedSpotDetails.level}</span></div>
              {selectedSpotDetails.slot && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: '#888' }}>Slot:</span><span style={{ color: '#00ff88' }}>{selectedSpotDetails.slot}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: '#888' }}>Status:</span><span style={{ color: getStatusColor(selectedSpotDetails.status) }}>{getStatusLabel(selectedSpotDetails.status)}</span></div>
              {selectedSpotDetails.spot?.is_auto_entry && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: '#888' }}>Type:</span><span style={{ color: '#00ccff' }}>Auto-Entry</span></div>}
            </div>
            {selectedSpotDetails.user && (
              <>
                <hr style={{ borderColor: '#333', margin: '15px 0' }} />
                <h3 style={{ color: '#ffa502', marginBottom: 15 }}>👤 User Details</h3>
                <div style={{ marginBottom: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: '#888' }}>Name:</span><span style={{ color: 'white' }}>{selectedSpotDetails.user.name}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: '#888' }}>Alias:</span><span style={{ color: 'white' }}>{selectedSpotDetails.user.alias}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: '#888' }}>Email:</span><span style={{ color: 'white' }}>{selectedSpotDetails.user.email}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: '#888' }}>Points:</span><span style={{ color: '#00ff88' }}>{formatNumber(selectedSpotDetails.user.master_points)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: '#888' }}>Commission:</span><span style={{ color: '#ffa502' }}>{formatNumber(selectedSpotDetails.user.commission_earned)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ color: '#888' }}>Referral Code:</span><span style={{ color: '#00ccff' }}>{selectedSpotDetails.user.referral_code}</span></div>
                </div>
              </>
            )}
            <button onClick={() => setShowSpotModal(false)} style={{ width: '100%', padding: 12, background: '#333', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', marginTop: 15 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard