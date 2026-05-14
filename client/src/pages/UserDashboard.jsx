// client/src/pages/UserDashboard.jsx
// THE MATRIX V5.0 - Professional Clean Design
// UPDATED: Using Edge Function for matrix visualization (bypasses RLS)

import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AgentTab from './AgentTab'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const formatTimeHelper = (seconds) => {
  if (seconds === undefined || seconds === null || isNaN(seconds)) {
    return '00:00:00'
  }
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Design System - Matching Landing Page
const styles = {
  container: {
    minHeight: '100vh',
    background: '#0d0d12',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#16161f',
    padding: '16px 32px',
    borderBottom: '1px solid #252530',
    flexWrap: 'wrap',
    gap: '16px',
  },
  logo: {
    color: '#00ff88',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: '-0.02em',
  },
  activeMemberBadge: {
    background: 'linear-gradient(135deg, #00ff88, #00ccff)',
    color: '#0d0d12',
    padding: '4px 12px',
    borderRadius: '100px',
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  welcomeText: {
    color: 'white',
  },
  logoutButton: {
    padding: '8px 16px',
    background: '#ff4444',
    border: 'none',
    borderRadius: '100px',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
  },
  mainContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  grid4: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  statCard: {
    background: '#16161f',
    padding: '20px',
    borderRadius: '16px',
    textAlign: 'center',
    border: '1px solid #252530',
  },
  statLabel: {
    color: '#aaa',
    fontSize: '14px',
    marginBottom: '8px',
  },
  statValue: {
    color: '#00ff88',
    fontSize: '32px',
    fontWeight: 'bold',
  },
  actionCard: {
    background: '#16161f',
    padding: '24px',
    borderRadius: '16px',
    marginBottom: '32px',
    border: '1px solid #252530',
  },
  sectionTitle: {
    color: '#00ccff',
    fontSize: '18px',
    marginBottom: '16px',
    fontWeight: 'bold',
  },
  codeBlock: {
    display: 'block',
    background: '#0d0d12',
    padding: '12px',
    borderRadius: '12px',
    textAlign: 'center',
    color: '#00ff88',
    marginBottom: '12px',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
    fontSize: '14px',
    border: '1px solid #252530',
  },
  buttonPrimary: {
    padding: '10px',
    background: '#00ccff',
    border: 'none',
    borderRadius: '100px',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: '#0d0d12',
    transition: 'all 0.2s ease',
  },
  buttonSecondary: {
    padding: '10px',
    background: '#252530',
    border: 'none',
    borderRadius: '100px',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buttonSuccess: {
    padding: '12px',
    background: '#00ff88',
    border: 'none',
    borderRadius: '100px',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: '#0d0d12',
    transition: 'all 0.2s ease',
  },
  buttonDanger: {
    padding: '12px',
    background: '#ff4444',
    border: 'none',
    borderRadius: '100px',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buttonWarning: {
    padding: '12px',
    background: '#ffa502',
    border: 'none',
    borderRadius: '100px',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: '#0d0d12',
    transition: 'all 0.2s ease',
  },
  buttonPurple: {
    padding: '12px',
    background: '#9b59b6',
    border: 'none',
    borderRadius: '100px',
    fontWeight: 'bold',
    cursor: 'pointer',
    color: 'white',
    transition: 'all 0.2s ease',
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  tabContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '24px',
    borderBottom: '1px solid #252530',
    paddingBottom: '12px',
    flexWrap: 'wrap',
  },
  tabButton: (isActive, color) => ({
    padding: '10px 24px',
    background: isActive ? (color || '#00ff88') : 'transparent',
    border: isActive ? 'none' : `1px solid ${color || '#00ff88'}`,
    borderRadius: '100px',
    fontSize: '14px',
    color: isActive ? '#0d0d12' : (color || '#00ff88'),
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  }),
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '16px',
    border: '1px solid #252530',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '600px',
  },
  tableHeader: {
    borderBottom: '1px solid #252530',
  },
  tableHeaderCell: {
    textAlign: 'left',
    padding: '12px',
    color: '#888',
  },
  tableRow: {
    borderBottom: '1px solid #252530',
  },
  tableCell: {
    padding: '12px',
    color: '#aaa',
  },
  tableCellWhite: {
    padding: '12px',
    color: 'white',
  },
  tableCellRight: {
    padding: '12px',
    textAlign: 'right',
    color: '#aaa',
  },
  tableCellGreen: {
    padding: '12px',
    textAlign: 'right',
    color: '#00ff88',
  },
  tableCellRed: {
    padding: '12px',
    textAlign: 'right',
    color: '#ff6666',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.95)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modalContent: {
    background: '#16161f',
    padding: '32px',
    borderRadius: '20px',
    maxWidth: '500px',
    width: '90%',
    border: '1px solid #00ff88',
  },
  modalInput: {
    width: '100%',
    padding: '12px',
    marginBottom: '16px',
    background: '#0d0d12',
    border: '1px solid #252530',
    borderRadius: '12px',
    color: 'white',
    fontSize: '14px',
  },
  modalSelect: {
    width: '100%',
    padding: '12px',
    marginBottom: '16px',
    background: '#0d0d12',
    border: '1px solid #252530',
    borderRadius: '12px',
    color: 'white',
    cursor: 'pointer',
  },
  footer: {
    textAlign: 'center',
    marginTop: '48px',
    padding: '24px',
    borderTop: '1px solid #252530',
    color: '#555',
    fontSize: '12px',
  },
}

function UserDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [userData, setUserData] = useState(null)
  const [userMatrices, setUserMatrices] = useState([])
  const [expandedMatrices, setExpandedMatrices] = useState(new Set())
  const [transactions, setTransactions] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({
    master_points: 0,
    commission_earned: 0,
    spots_filled: 0,
    recovery_fund: 0
  })

  const [pendingStatus, setPendingStatus] = useState(null)
  const [pendingSignupId, setPendingSignupId] = useState(null)
  const [countdown, setCountdown] = useState({ formatted: '00:00:00', seconds: 0 })
  const countdownIntervalRef = useRef(null)

  const [quickStartStatus, setQuickStartStatus] = useState({
    eligible: false,
    claimed: false,
    expired: false,
    daysRemaining: 0,
    level1Complete: false
  })
  const [claimingBonus, setClaimingBonus] = useState(false)

  const [showPromotionModal, setShowPromotionModal] = useState(false)
  const [activePromotion, setActivePromotion] = useState(null)
  const [enteringPromotion, setEnteringPromotion] = useState(false)

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

  const [showLoadModal, setShowLoadModal] = useState(false)
  const [loadAmount, setLoadAmount] = useState('')
  const [loadLoading, setLoadLoading] = useState(false)
  const [loadPaymentMethod, setLoadPaymentMethod] = useState('crypto')
  const [activationCode, setActivationCode] = useState('')

  const [showCashoutModal, setShowCashoutModal] = useState(false)
  const [cashoutAmount, setCashoutAmount] = useState('')
  const [cashoutLoading, setCashoutLoading] = useState(false)
  const [cashoutCryptoType, setCashoutCryptoType] = useState('USDT')
  const [walletAddress, setWalletAddress] = useState('')

  const [walletAddresses, setWalletAddresses] = useState({ usdt: '', usdc: '' })
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  
  const [bellAnimate, setBellAnimate] = useState(false)
  const prevUnreadCountRef = useRef(unreadCount)

  const [isActiveMember, setIsActiveMember] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const GET_USER_DATA_URL = `${SUPABASE_URL}/functions/v1/get-user-data`
  const BUY_SPONSORED_URL = `${SUPABASE_URL}/functions/v1/buy-self-sponsored`
  const SEARCH_USERS_URL = `${SUPABASE_URL}/functions/v1/search-users`
  const TRANSFER_URL = `${SUPABASE_URL}/functions/v1/transfer-points`
  const CREATE_INVOICE_URL = `${SUPABASE_URL}/functions/v1/create-nowpayments-invoice`
  const VALIDATE_CODE_URL = `${SUPABASE_URL}/functions/v1/validate-activation-code`
  const BONUS_ENGINE_URL = `${SUPABASE_URL}/functions/v1/bonus-engine`

  const formatNumber = (num) => num?.toLocaleString() || '0'

  const loadNotificationsData = useCallback(async () => {
    if (!userData?.id) return
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (error) {
      console.error('Error loading notifications:', error)
      return
    }
    
    setNotifications(data || [])
    
    const unreadRegular = data?.filter(n => 
      !n.read && 
      n.type !== 'promotion_available' && 
      n.type !== 'raffle_announcement' && 
      n.type !== 'promotion_reminder'
    ).length || 0
    setUnreadCount(unreadRegular)
  }, [userData?.id])

  const markAsRead = async (notificationId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
    
    if (error) {
      console.error('Error marking as read:', error)
      return
    }
    
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = async () => {
    if (!userData?.id) return
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userData.id)
      .eq('read', false)
      .not('type', 'in', '("promotion_available","raffle_announcement","promotion_reminder")')
    
    if (error) {
      console.error('Error marking all as read:', error)
      return
    }
    
    setNotifications(prev => prev.map(n => {
      const isPromotion = n.type === 'promotion_available' || 
                          n.type === 'raffle_announcement' || 
                          n.type === 'promotion_reminder'
      if (!n.read && !isPromotion) {
        return { ...n, read: true }
      }
      return n
    }))
    
    const remainingUnread = notifications.filter(n => 
      !n.read && 
      n.type !== 'promotion_available' && 
      n.type !== 'raffle_announcement' && 
      n.type !== 'promotion_reminder'
    ).length
    setUnreadCount(remainingUnread)
  }

  const handleNotificationClick = async (notification) => {
    const isPromotion = notification.type === 'promotion_available' || 
                        notification.type === 'raffle_announcement' || 
                        notification.type === 'promotion_reminder'
    
    if (!isPromotion && !notification.read) {
      await markAsRead(notification.id)
    }
    
    setShowNotificationDropdown(false)
    
    if (isPromotion && notification.action_data) {
      let promotionId = null
      
      if (typeof notification.action_data === 'string') {
        try {
          const parsed = JSON.parse(notification.action_data)
          promotionId = parsed.promotionId
        } catch (e) {
          console.error('Failed to parse action_data:', e)
        }
      } else if (typeof notification.action_data === 'object') {
        promotionId = notification.action_data.promotionId
      }
      
      if (promotionId) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const response = await fetch(BONUS_ENGINE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
              action: 'getPromotionDetails',
              data: { promotionId, userId: userData?.id }
            })
          })
          const result = await response.json()
          
          if (result.success && result.promotion) {
            setActivePromotion(result.promotion)
            setShowPromotionModal(true)
          }
        } catch (error) {
          console.error('Error loading promotion:', error)
        }
      }
    }
  }

  const getNotificationIcon = (type) => {
    const icons = {
      'payment_approved': '💰', 'payment_rejected': '❌', 'cashout_approved': '💸',
      'cashout_rejected': '↩️', 'level_complete': '🏆', 'bonus_earned': '⭐',
      'referral_joined': '🎉', 'quick_start_bonus': '🚀', 'system_announcement': '📢',
      'raffle_winner': '🎲', 'promotion_available': '🎁', 'raffle_announcement': '🎲',
      'promotion_reminder': '⏰', 'transfer_request': '🔄'
    }
    return icons[type] || '📢'
  }

  const formatTimeAgo = (timestamp) => {
    const diff = Math.floor((new Date() - new Date(timestamp)) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const checkPendingStatus = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-activate-user`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'getPendingStatus',
          data: { userId: session.user.id }
        })
      })
      
      if (response.status === 401) return false
      
      const result = await response.json()
      
      if (result.hasPending && result.status === 'pending') {
        setPendingSignupId(result.pendingSignupId)
        setPendingStatus(result)
        
        let remainingSeconds = result.remaining?.seconds
        if (remainingSeconds === undefined && result.expiresAt) {
          remainingSeconds = Math.max(0, Math.floor((new Date(result.expiresAt) - new Date()) / 1000))
        }
        if (remainingSeconds === undefined || remainingSeconds <= 0) {
          remainingSeconds = 24 * 60 * 60
        }
        
        setCountdown({
          formatted: formatTimeHelper(remainingSeconds),
          seconds: remainingSeconds
        })
        
        return true
      }
      return false
    } catch (err) {
      console.log('Error checking pending status:', err)
      return false
    }
  }, [])

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true)
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        navigate('/login')
        return
      }

      const hasPending = await checkPendingStatus()
      if (hasPending) {
        setLoading(false)
        return
      }

      const response = await fetch(GET_USER_DATA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: session.user.id })
      })

      const result = await response.json()

      if (result.success) {
        setUserData(result.user)
        setStats({
          master_points: result.user.master_points || 0,
          commission_earned: result.user.commission_earned || 0,
          spots_filled: result.spots?.length || 0,
          recovery_fund: result.recoveryFund || 0
        })
        setTransactions(result.transactions || [])
        setIsActiveMember((result.user.master_points || 0) >= 12500)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }, [navigate, checkPendingStatus])

  // NEW: loadUserMatrices using Edge Function (bypasses RLS)
  const loadUserMatrices = useCallback(async () => {
    try {
      if (!userData?.id) return

      console.log('========== loadUserMatrices START (Edge Function) ==========')
      console.log('userData.id:', userData.id)

      // Get user's own spots from the matrix_spots table
      const { data: spots, error: spotsError } = await supabase
        .from('matrix_spots')
        .select('*')
        .eq('user_id', userData.id)

      if (spotsError) {
        console.error('Spots error:', spotsError)
        throw spotsError
      }

      console.log('Spots found:', spots?.length)

      if (!spots || spots.length === 0) {
        setUserMatrices([])
        return
      }

      // Sort spots by level and filled_at (same as original)
      const userSpotsSorted = [...spots].sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level
        return new Date(a.filled_at) - new Date(b.filled_at)
      })

      // For each spot owned by the user, fetch its complete sub-matrix via Edge Function
      const matrices = await Promise.all(
        spots.map(async (spot) => {
          console.log(`\n--- Processing spot ID: ${spot.id}, Level: ${spot.level} ---`)
          
          // Call the Edge Function to get all spots in this sub-matrix
          const { data: submatrix, error: subError } = await supabase.functions.invoke('get-submatrix', {
            body: { rootSpotId: spot.id }
          })

          if (subError) {
            console.error(`Submatrix error for spot ${spot.id}:`, subError)
            return null
          }

          if (!submatrix.success || !submatrix.allSpots) {
            console.error(`Invalid submatrix response for spot ${spot.id}`)
            return null
          }

          console.log(`Submatrix for spot ${spot.id}:`, submatrix.allSpots.length, 'spots returned')

          const allSpots = submatrix.allSpots
          
          // Find direct children (parent_id === spot.id) - these are Level 1 spots
          const level1 = allSpots.filter(s => s.parent_id === spot.id).sort((a, b) => a.position - b.position)
          console.log(`Level1 for spot ${spot.id}:`, level1.length, 'spots')
          
          // Find Level 2 spots (parent_id is in level1 ids)
          const level1Ids = level1.map(s => s.id)
          const level2 = allSpots.filter(s => level1Ids.includes(s.parent_id)).sort((a, b) => a.position - b.position)
          console.log(`Level2 for spot ${spot.id}:`, level2.length, 'spots')
          
          // Find Level 3 spots (parent_id is in level2 ids)
          const level2Ids = level2.map(s => s.id)
          const level3 = allSpots.filter(s => level2Ids.includes(s.parent_id)).sort((a, b) => a.position - b.position)
          console.log(`Level3 for spot ${spot.id}:`, level3.length, 'spots')

          // Enrich spots with display logic (EXACT match to original display behavior)
          const enrichedLevel1 = (level1 || []).map(s => ({
            ...s,
            isSelf: s.user_id === userData.id,
            displayText: s.user_id === userData.id ? 'SELF' : (s.reserved_until || s.pending_signup_id ? 'RES\'D' : (s.user_name || 'Empty'))
          }))

          const enrichedLevel2 = (level2 || []).map(s => ({
            ...s,
            isSelf: s.user_id === userData.id,
            displayText: s.user_id === userData.id ? 'SELF' : (s.reserved_until || s.pending_signup_id ? 'RES\'D' : (s.user_name || 'Empty'))
          }))

          const enrichedLevel3 = (level3 || []).map(s => ({
            ...s,
            isSelf: s.user_id === userData.id,
            displayText: s.user_id === userData.id ? 'SELF' : (s.reserved_until || s.pending_signup_id ? 'RES\'D' : (s.user_name || 'Empty'))
          }))

          const filledCount = 1 + level1.length + level2.length + level3.length
          const isOriginal = spot.id === userSpotsSorted[0]?.id
          const isAutoEntry = spot.is_auto_entry || false

          return {
            spotId: spot.id,
            level: spot.level,
            position: spot.position,
            matrixId: spot.matrix_id,
            isOriginal,
            isSelfSponsored: !isOriginal && !isAutoEntry,
            isAutoEntry,
            level1: enrichedLevel1,
            level2: enrichedLevel2,
            level3: enrichedLevel3,
            filledCount
          }
        })
      )

      // Filter out any null matrices from errors
      const validMatrices = matrices.filter(m => m !== null)
      console.log('Total valid matrices created:', validMatrices.length)
      setUserMatrices(validMatrices)
      
      // Expand the original matrix by default
      const originalMatrix = validMatrices.find(m => m?.isOriginal)
      if (originalMatrix) {
        console.log('Setting expanded matrix:', originalMatrix.spotId)
        setExpandedMatrices(new Set([originalMatrix.spotId]))
      }
      
      console.log('========== loadUserMatrices END ==========')
    } catch (error) {
      console.error('Error loading matrices:', error)
    }
  }, [userData?.id])

  const loadQuickStartStatus = useCallback(async () => {
    if (!userData?.id) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(BONUS_ENGINE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'getQuickStartStatus',
          data: { userId: userData.id }
        })
      })
      const result = await response.json()
      if (result.success) {
        setQuickStartStatus({
          eligible: result.eligible,
          claimed: result.claimed,
          expired: result.expired,
          daysRemaining: result.daysRemaining,
          level1Complete: result.level1Complete
        })
      }
    } catch (error) {
      console.error('Error loading quick start status:', error)
    }
  }, [userData?.id])

  const loadWalletAddresses = useCallback(async () => {
    const { data } = await supabase.from('system_settings').select('key, value')
    const addresses = {}
    data?.forEach(s => { addresses[s.key] = s.value })
    setWalletAddresses(addresses)
  }, [])

  const expireOldPromotions = useCallback(async () => {
    if (!userData?.id) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(BONUS_ENGINE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'getAllPromotions',
          data: {}
        })
      })
      const result = await response.json()
      
      if (result.success && result.promotions) {
        const endedPromotionIds = result.promotions
          .filter(p => new Date(p.end_date) < new Date())
          .map(p => p.id)
        
        if (endedPromotionIds.length > 0) {
          await supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('user_id', userData.id)
            .eq('read', false)
            .in('type', ['promotion_available', 'raffle_announcement', 'promotion_reminder'])
          
          loadNotificationsData()
        }
      }
    } catch (error) {
      console.error('Error expiring promotions:', error)
    }
  }, [userData?.id, loadNotificationsData])

  useEffect(() => {
    loadUserData()
    loadWalletAddresses()
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [loadUserData, loadWalletAddresses])

  useEffect(() => {
    if (userData?.id && userData?.account_status === 'active') {
      loadUserMatrices()
      loadNotificationsData()
      loadQuickStartStatus()
      expireOldPromotions()
    }
  }, [userData?.id, userData?.account_status, loadUserMatrices, loadNotificationsData, loadQuickStartStatus, expireOldPromotions])

  useEffect(() => {
    let interval = null
    
    if (unreadCount > 0) {
      setBellAnimate(true)
      interval = setInterval(() => {
        setBellAnimate(true)
      }, 30000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [unreadCount])

  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current && unreadCount > 0) {
      setBellAnimate(true)
    }
    prevUnreadCountRef.current = unreadCount
  }, [unreadCount])

  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    
    if (pendingStatus?.hasPending && pendingStatus?.status === 'pending' && countdown.seconds > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev.seconds <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current)
              countdownIntervalRef.current = null
            }
            return { formatted: '00:00:00', seconds: 0 }
          }
          
          const newSeconds = prev.seconds - 1
          const newFormatted = formatTimeHelper(newSeconds)
          
          setPendingStatus(prevStatus => {
            if (!prevStatus) return prevStatus
            return {
              ...prevStatus,
              remaining: {
                seconds: newSeconds,
                formatted: newFormatted
              }
            }
          })
          
          return {
            formatted: newFormatted,
            seconds: newSeconds
          }
        })
      }, 1000)
    }
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }
  }, [pendingStatus?.hasPending, pendingStatus?.status, countdown.seconds])

  useEffect(() => {
    setIsActiveMember((stats.master_points || 0) >= 12500)
  }, [stats.master_points])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMobileMenu && !e.target.closest('.mobile-menu-container')) {
        setShowMobileMenu(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showMobileMenu])

  const refreshAllData = useCallback(() => {
    loadUserData()
    loadUserMatrices()
    loadNotificationsData()
    loadQuickStartStatus()
    expireOldPromotions()
  }, [loadUserData, loadUserMatrices, loadNotificationsData, loadQuickStartStatus, expireOldPromotions])

  const cancelRegistration = async () => {
    if (!confirm('Are you sure you want to cancel your registration?')) return

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-activate-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: 'cancelPending',
          data: { pendingSignupId: pendingSignupId }
        })
      })
      const result = await response.json()
      if (result.success) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
        setPendingStatus(null)
        setPendingSignupId(null)
        await supabase.auth.signOut()
        window.location.href = '/signup?message=Registration+cancelled'
      } else {
        alert(result.error)
      }
    } catch (error) {
      console.error('Error cancelling registration:', error)
      alert('Error cancelling registration')
    } finally {
      setLoading(false)
    }
  }

  const toggleMatrix = (spotId) => {
    const newSet = new Set(expandedMatrices)
    if (newSet.has(spotId)) newSet.delete(spotId)
    else newSet.add(spotId)
    setExpandedMatrices(newSet)
  }

  const buySelfSponsored = async () => {
    if (buying) return
    if (!confirm(`⚠️ Buy self-sponsored spot for 50,000 points?\n\nYour balance: ${formatNumber(stats.master_points)} points`)) return

    try {
      setBuying(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Please login again')
        return
      }
      if ((stats.master_points || 0) < 50000) {
        alert('Insufficient points. You need 50,000 points.')
        return
      }

      const response = await fetch(BUY_SPONSORED_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'purchase',
          data: { userId: session.user.id }
        })
      })

      const result = await response.json()
      if (result.success) {
        alert('✅ ' + result.message)
        refreshAllData()
      } else {
        alert('❌ ' + result.message)
      }
    } catch (error) {
      console.error(error)
      alert('Error buying self-sponsored account')
    } finally {
      setBuying(false)
    }
  }

  const claimQuickStartBonus = async () => {
    if (!quickStartStatus.eligible || quickStartStatus.claimed) {
      alert('Bonus not available')
      return
    }

    setClaimingBonus(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(BONUS_ENGINE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'claimQuickStartBonus',
          data: { userId: userData.id }
        })
      })
      const result = await response.json()
      if (result.success) {
        alert(`✅ Quick Start Bonus claimed! ${result.amount.toLocaleString()} points added!`)
        refreshAllData()
      } else {
        alert('❌ ' + result.error)
      }
    } catch (error) {
      alert('Error claiming bonus: ' + error.message)
    } finally {
      setClaimingBonus(false)
    }
  }

  const handleRedeemCode = async () => {
  if (!activationCode.trim()) {
    alert('Please enter an activation code')
    return
  }

  setLoadLoading(true)
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      alert('You must be logged in to redeem a code')
      return
    }

    const response = await fetch(VALIDATE_CODE_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`  // ✅ THIS IS THE FIX
      },
      body: JSON.stringify({
        code: activationCode,
        userId: session.user.id  // This triggers the auth requirement
      })
    })

    const result = await response.json()
    
    if (result.success) {
      alert(`✅ ${result.message}`)
      setShowLoadModal(false)
      setLoadAmount('')
      setActivationCode('')
      refreshAllData()
    } else {
      alert('❌ ' + (result.error || 'Invalid code'))
    }
  } catch (error) {
    console.error('Redeem error:', error)
    alert('Error redeeming code: ' + error.message)
  } finally {
    setLoadLoading(false)
  }
}

  const handleSubmitCashout = async () => {
    const requestedPoints = parseInt(cashoutAmount)
    const feePoints = Math.floor(requestedPoints * 0.01)
    const netPoints = requestedPoints - feePoints
    const netUsd = netPoints / 200

    if (!cashoutAmount || requestedPoints < 20000) {
      alert('Minimum cashout is 20,000 points')
      return
    }
    if (!walletAddress) {
      alert('Please enter your wallet address')
      return
    }
    if (requestedPoints > (stats.master_points || 0)) {
      alert('Insufficient points')
      return
    }
    if (!confirm(`⚠️ Cashout ${requestedPoints.toLocaleString()} points\n\nFee (1%): -${feePoints.toLocaleString()} points\nNet: ${netPoints.toLocaleString()} points ($${netUsd.toFixed(2)})\n\nContinue?`)) {
      return
    }

    setCashoutLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: currentUser } = await supabase
        .from('users')
        .select('master_points, name')
        .eq('id', session.user.id)
        .single()
      const user = currentUser
      const usdAmount = (requestedPoints / 200).toFixed(2)

      const { error: requestError } = await supabase
        .from('cashout_requests')
        .insert({
          user_id: session.user.id,
          user_name: user?.name,
          points_amount: requestedPoints,
          usd_amount: parseFloat(usdAmount),
          wallet_address: walletAddress,
          crypto_type: cashoutCryptoType,
          status: 'pending'
        })
      if (requestError) throw requestError

      await supabase.from('notifications').insert({
        user_id: session.user.id,
        type: 'cashout_requested',
        title: '💸 Cashout Request Submitted',
        message: `Your cashout request for ${requestedPoints.toLocaleString()} points has been submitted and is pending review.`,
        created_at: new Date().toISOString()
      })

      alert(`✅ Cashout request for ${requestedPoints.toLocaleString()} points submitted! You will be notified when approved.`)
      setShowCashoutModal(false)
      setCashoutAmount('')
      setWalletAddress('')
      refreshAllData()
    } catch (error) {
      console.error(error)
      alert('Error processing cashout: ' + error.message)
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
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(SEARCH_USERS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ query: searchQuery, excludeUserId: session.user.id })
      })
      const result = await response.json()
      if (result.success) setSearchResults(result.users)
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
    if (parseInt(transferAmount) > (stats.master_points || 0)) {
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
      const { data: { session } } = await supabase.auth.getSession()
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          fromUserId: session.user.id,
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
        refreshAllData()
      } else {
        alert(`❌ ${result.message}`)
      }
    } catch (error) {
      alert('Error processing transfer')
    } finally {
      setTransferLoading(false)
    }
  }

  const enterPromotion = async () => {
    if (!activePromotion || enteringPromotion) return
    
    if ((stats.master_points || 0) < activePromotion.entry_cost) {
      alert(`Insufficient points. Need ${activePromotion.entry_cost.toLocaleString()} points`)
      return
    }
    
    setEnteringPromotion(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(BONUS_ENGINE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'enterRaffleViaModal',
          data: {
            userId: userData.id,
            promotionId: activePromotion.id
          }
        })
      })
      const result = await response.json()
      if (result.success) {
        alert(`✅ ${result.message}`)
        setShowPromotionModal(false)
        setActivePromotion(null)
        refreshAllData()
      } else {
        alert(`❌ ${result.error}`)
      }
    } catch (error) {
      alert('Error entering promotion: ' + error.message)
    } finally {
      setEnteringPromotion(false)
    }
  }

  const handleLogout = async () => {
  await supabase.auth.signOut()
  sessionStorage.removeItem('isAdmin')
  window.location.href = '/'  // Force full page reload to landing page
}

  const getTransactionDisplay = (tx) => {
    if (tx.type === 'commission_level_1') return '💰 Commission (Direct Referral)'
    if (tx.type === 'commission_level_2') return '💰 Commission (Level 2)'
    if (tx.type === 'commission_level_3') return '💰 Commission (Level 3)'
    if (tx.type === 'commission') return '💰 Commission'
    return tx.type?.replace(/_/g, ' ').toUpperCase() || 'Transaction'
  }

  const getMatrixTitle = (matrix) => {
    if (matrix.isAutoEntry) return '🔄 Auto-Entry Matrix'
    if (matrix.isOriginal) return '⭐ Original Matrix'
    return '📌 Self-Sponsored Matrix'
  }

  const getMatrixColor = (matrix) => {
    if (matrix.isAutoEntry) return '#00ccff'
    if (matrix.isOriginal) return '#ffd700'
    return '#ffa502'
  }

  const getSubMatrixMax = () => 85

  const renderLevel1Spots = (matrix) => {
    const children = matrix.level1 || []
    const spots = []
    for (let i = 0; i < 4; i++) {
      const occupant = children[i]
      const displayText = occupant?.displayText || 'Empty'
      const isSelf = occupant?.isSelf || false
      const isReserved = displayText === 'RES\'D'
      
      spots.push(
        <div key={i} style={{
          width: '70px', height: '70px',
          background: occupant ? (isSelf ? 'rgba(255,165,2,0.15)' : 'rgba(0,255,136,0.15)') : 'rgba(255,255,255,0.05)',
          border: occupant ? (isSelf ? '2px solid #ffa502' : '2px solid #00ff88') : (isReserved ? '2px solid #ffa502' : '2px solid rgba(0,255,255,0.2)'),
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative'
        }}>
          {occupant ? (
            <div style={{ 
              color: isSelf ? '#ffa502' : (isReserved ? '#ffa502' : '#00ff88'), 
              fontSize: '11px', 
              fontWeight: 'bold',
              textAlign: 'center',
              wordBreak: 'break-word',
              padding: '4px'
            }}>
              {displayText.length > 8 ? displayText.substring(0, 6) + '..' : displayText}
            </div>
          ) : (
            <div style={{ color: isReserved ? '#ffa502' : '#ff6666', fontSize: '10px' }}>
              {displayText}
            </div>
          )}
        </div>
      )
    }
    return spots
  }

  const renderLevel2Spots = (matrix) => {
    const children = matrix.level2 || []
    const spots = []
    for (let i = 0; i < Math.min(children.length, 8); i++) {
      const occupant = children[i]
      const displayText = occupant?.displayText || 'Empty'
      const isSelf = occupant?.isSelf || false
      const isReserved = displayText === 'RES\'D'
      
      spots.push(
        <div key={i} style={{
          width: '50px', height: '50px',
          background: occupant ? (isSelf ? 'rgba(255,165,2,0.1)' : 'rgba(0,255,136,0.1)') : 'rgba(255,255,255,0.03)',
          border: occupant ? (isSelf ? '1px solid #ffa502' : '1px solid #00ff88') : (isReserved ? '1px solid #ffa502' : '1px solid rgba(0,255,255,0.15)'),
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '9px'
        }}>
          {occupant ? (
            <div style={{ color: isSelf ? '#ffa502' : (isReserved ? '#ffa502' : '#00ff88'), fontSize: '9px', fontWeight: 'bold', textAlign: 'center' }}>
              {displayText.length > 6 ? displayText.substring(0, 4) + '..' : displayText}
            </div>
          ) : (
            <div style={{ color: isReserved ? '#ffa502' : '#666', fontSize: '8px' }}>{displayText}</div>
          )}
        </div>
      )
    }
    if (children.length > 8) {
      spots.push(
        <div key="more" style={{
          width: '50px', height: '50px',
          background: 'rgba(255,165,2,0.1)',
          border: '1px solid #ffa502',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', color: '#ffa502'
        }}>
          +{children.length - 8}
        </div>
      )
    }
    return spots
  }

  const renderLevel3Spots = (matrix) => {
    const children = matrix.level3 || []
    const spots = []
    for (let i = 0; i < Math.min(children.length, 8); i++) {
      const occupant = children[i]
      const displayText = occupant?.displayText || 'Empty'
      const isSelf = occupant?.isSelf || false
      const isReserved = displayText === 'RES\'D'
      
      spots.push(
        <div key={i} style={{
          width: '40px', height: '40px',
          background: occupant ? (isSelf ? 'rgba(255,165,2,0.08)' : 'rgba(0,255,136,0.08)') : 'rgba(255,255,255,0.02)',
          border: occupant ? (isSelf ? '1px solid #ffa502' : '1px solid #00ff88') : (isReserved ? '1px solid #ffa502' : '1px solid rgba(0,255,255,0.1)'),
          borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '8px'
        }}>
          {occupant ? (
            <div style={{ color: isSelf ? '#ffa502' : (isReserved ? '#ffa502' : '#00ff88'), fontSize: '8px', fontWeight: 'bold', textAlign: 'center' }}>
              {displayText.length > 5 ? displayText.substring(0, 3) + '..' : displayText}
            </div>
          ) : (
            <div style={{ color: isReserved ? '#ffa502' : '#666', fontSize: '7px' }}>{displayText}</div>
          )}
        </div>
      )
    }
    if (children.length > 8) {
      spots.push(
        <div key="more" style={{
          width: '40px', height: '40px',
          background: 'rgba(255,165,2,0.1)',
          border: '1px solid #ffa502',
          borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '8px', color: '#ffa502'
        }}>
          +{children.length - 8}
        </div>
      )
    }
    return spots
  }

  const renderMatrixVisualization = (matrix) => {
    const isExpanded = expandedMatrices.has(matrix.spotId)
    const titleColor = getMatrixColor(matrix)

    return (
      <div key={matrix.spotId} style={{ marginBottom: '20px', border: `1px solid ${titleColor}40`, borderRadius: '16px', overflow: 'hidden' }}>
        <div onClick={() => toggleMatrix(matrix.spotId)} style={{
          background: matrix.isOriginal ? '#1a3a3a' : matrix.isAutoEntry ? '#1a2a3a' : '#2a2a4a',
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ color: titleColor, fontWeight: 'bold' }}>{getMatrixTitle(matrix)}</span>
            <span style={{ color: '#888', fontSize: '11px', marginLeft: '10px' }}>Level {matrix.level}</span>
            <span style={{ color: '#ffa502', fontSize: '11px', marginLeft: '10px' }}>{matrix.filledCount}/{getSubMatrixMax()} spots</span>
            <span style={{ color: '#00ccff', fontSize: '10px', marginLeft: '10px' }}>Abs Pos: {matrix.position}</span>
          </div>
          <div style={{ color: '#00ccff', fontSize: '18px' }}>{isExpanded ? '▼' : '▶'}</div>
        </div>
        {isExpanded && (
          <div style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'inline-block', background: '#0d0d12', padding: '10px 20px', borderRadius: '12px', border: `2px solid ${titleColor}` }}>
                <div style={{ fontSize: '10px', color: '#888' }}>Level 0 (Sub-Root)</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: titleColor }}>👤 YOU</div>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <span style={{ color: '#ffa502', fontWeight: 'bold', fontSize: '12px' }}>LEVEL 1</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>{renderLevel1Spots(matrix)}</div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ textAlign: 'center', marginBottom: '5px' }}>
                <span style={{ color: '#ffa502', fontWeight: 'bold', fontSize: '12px' }}>LEVEL 2</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>{renderLevel2Spots(matrix)}</div>
            </div>
            <div>
              <div style={{ textAlign: 'center', marginBottom: '5px' }}>
                <span style={{ color: '#ffa502', fontWeight: 'bold', fontSize: '12px' }}>LEVEL 3</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>{renderLevel3Spots(matrix)}</div>
              <p style={{ textAlign: 'center', fontSize: '11px', color: '#aaa', marginTop: '5px' }}>
                L2: {matrix.level2.length}/16 | L3: {matrix.level3.length}/64
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  const bellAnimationStyle = `
    @keyframes bellRing {
      0% { transform: rotate(0deg); }
      8% { transform: rotate(15deg); }
      16% { transform: rotate(-15deg); }
      24% { transform: rotate(10deg); }
      32% { transform: rotate(-10deg); }
      40% { transform: rotate(5deg); }
      48% { transform: rotate(-5deg); }
      56% { transform: rotate(2deg); }
      64% { transform: rotate(-2deg); }
      100% { transform: rotate(0deg); }
    }
  `

  if (pendingStatus?.hasPending && pendingStatus?.status === 'pending') {
    const isExpired = countdown.seconds <= 0
    
    return (
      <div style={styles.container}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
          <div style={{ background: '#16161f', padding: '40px', borderRadius: '20px', maxWidth: '500px', width: '100%', textAlign: 'center', border: '1px solid #ffa502' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>⏳</div>
            <h2 style={{ color: '#ffa502', marginBottom: '15px' }}>Payment Required</h2>
            <p style={{ color: '#aaa', marginBottom: '20px' }}>
              Your spot has been reserved. Complete payment within 24 hours to activate your matrix position.
            </p>
            <div style={{ background: '#0d0d12', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', fontSize: '36px', fontWeight: 'bold', margin: 0 }}>{countdown.formatted}</p>
              <p style={{ color: '#888', fontSize: '12px', marginTop: '5px' }}>Time remaining</p>
            </div>
            {isExpired && (
              <p style={{ color: '#ff4444', marginBottom: '15px' }}>⚠️ Your reservation has expired. Please re-register.</p>
            )}
            <button
              onClick={() => window.location.href = '/signup?resume=true'}
              disabled={isExpired}
              style={{ width: '100%', padding: '14px', background: isExpired ? '#555' : '#ffa502', border: 'none', borderRadius: '100px', fontWeight: 'bold', cursor: isExpired ? 'not-allowed' : 'pointer', marginBottom: '10px', fontSize: '16px', color: '#0d0d12' }}
            >
              Complete Payment
            </button>
            <button
              onClick={cancelRegistration}
              style={{ width: '100%', padding: '14px', background: '#252530', border: 'none', borderRadius: '100px', color: '#ff6666', cursor: 'pointer', fontSize: '16px' }}
            >
              Cancel Registration
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #00ff88', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ color: 'white', marginTop: '15px' }}>Loading...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    )
  }

  const referralLink = `${window.location.origin}/?ref=${userData?.referral_code || ''}`

  const NotificationBell = () => (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
        style={{
          background: 'transparent',
          border: 'none',
          fontSize: isMobile ? '20px' : '22px',
          cursor: 'pointer',
          position: 'relative',
          padding: '5px',
          color: '#aaa',
          display: 'inline-block',
          animation: bellAnimate ? 'bellRing 3s ease-in-out' : 'none',
          transformOrigin: 'top center'
        }}
        onAnimationEnd={() => setBellAnimate(false)}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#ff4444',
            color: 'white',
            borderRadius: '50%',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 'bold',
            minWidth: '18px',
            textAlign: 'center'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  )

  const NotificationDropdown = () => (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 999
        }}
        onClick={() => setShowNotificationDropdown(false)}
      />
      <div style={{
        position: 'absolute',
        top: '45px',
        right: '0',
        width: 'min(380px, calc(100vw - 20px))',
        maxHeight: '450px',
        overflowY: 'auto',
        background: '#16161f',
        border: '1px solid #00ff88',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        zIndex: 1000
      }}>
        <div style={{ 
          padding: '16px', 
          borderBottom: '1px solid #252530',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          background: '#16161f',
          zIndex: 1
        }}>
          <h3 style={{ color: '#00ff88', margin: 0, fontSize: '16px' }}>🔔 Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#00ccff',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Mark all read
            </button>
          )}
        </div>
        
        {notifications.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: '30px' }}>No notifications yet</p>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              style={{
                padding: '16px',
                borderBottom: '1px solid #252530',
                background: notification.read ? 'transparent' : '#0d0d12',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#252530'}
              onMouseLeave={(e) => e.currentTarget.style.background = notification.read ? 'transparent' : '#0d0d12'}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ fontSize: '20px' }}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ 
                    color: notification.read ? '#aaa' : 'white', 
                    fontWeight: notification.read ? 'normal' : 'bold',
                    marginBottom: '5px',
                    fontSize: '14px'
                  }}>
                    {notification.title}
                  </p>
                  <p style={{ color: '#888', fontSize: '12px', marginBottom: '5px' }}>
                    {notification.message}
                  </p>
                  <p style={{ color: '#666', fontSize: '10px' }}>
                    {formatTimeAgo(notification.created_at)}
                  </p>
                </div>
                {!notification.read && (
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    background: '#00ff88', 
                    borderRadius: '50%' 
                  }} />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )

  return (
    <div style={styles.container}>
      <style>{bellAnimationStyle}</style>
      
      {isMobile ? (
        <div className="mobile-menu-container" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 16px',
          background: '#16161f',
          borderBottom: '1px solid #00ff88'
        }}>
          <h1 style={styles.logo} onClick={() => navigate('/')}>
            🔷 THE MATRIX
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <NotificationBell />
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#00ff88', padding: '5px' }}
            >
              ☰
            </button>
          </div>
          
          {showMobileMenu && (
            <div style={{
              position: 'absolute',
              top: '55px',
              right: '16px',
              background: '#16161f',
              border: '1px solid #00ff88',
              borderRadius: '12px',
              padding: '12px',
              minWidth: '220px',
              zIndex: 1000,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
              <div style={{ padding: '10px', borderBottom: '1px solid #252530', color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>
                👤 {userData?.name || 'User'}
              </div>
              
              {isActiveMember && (
                <div style={{ padding: '10px', borderBottom: '1px solid #252530', color: '#00ff88', fontSize: '12px', fontWeight: 'bold' }}>
                  ⭐ ACTIVE MEMBER
                </div>
              )}
              
              <div style={{ padding: '10px', borderBottom: '1px solid #252530', cursor: 'pointer', color: '#ffffff', fontWeight: '500' }} 
                   onClick={() => { setShowCashoutModal(true); setShowMobileMenu(false) }}>
                💸 Cash Out
              </div>
              
              <div style={{ padding: '10px', borderBottom: '1px solid #252530', cursor: 'pointer', color: '#ffffff', fontWeight: '500' }} 
                   onClick={() => { refreshAllData(); setShowMobileMenu(false) }}>
                🔄 Refresh Dashboard
              </div>
              
              <div style={{ padding: '10px', borderBottom: '1px solid #252530', cursor: 'pointer', color: '#ffffff', fontWeight: '500' }} 
                   onClick={() => { openTransferModal(); setShowMobileMenu(false) }}>
                💸 Transfer Points
              </div>
              
              <div style={{ padding: '10px', borderBottom: '1px solid #252530', cursor: 'pointer', color: '#ffffff', fontWeight: '500' }} 
                   onClick={() => { setShowLoadModal(true); setShowMobileMenu(false) }}>
                💰 Load Points
              </div>
              
              <div style={{ padding: '10px', borderBottom: '1px solid #252530', cursor: 'pointer', color: '#ffffff', fontWeight: '500' }} 
                   onClick={() => { buySelfSponsored(); setShowMobileMenu(false) }}>
                🔄 Buy Self-Sponsored
              </div>
              
              <div style={{ padding: '10px', borderBottom: '1px solid #252530', cursor: 'pointer', color: '#ffffff', fontWeight: '500' }} 
                   onClick={() => { navigator.clipboard.writeText(userData?.referral_code); alert('Copied!'); setShowMobileMenu(false) }}>
                📋 Copy Referral Code
              </div>
              
              <div style={{ padding: '10px', borderBottom: '1px solid #252530', cursor: 'pointer', color: '#ffffff', fontWeight: '500' }} 
                   onClick={() => { navigator.clipboard.writeText(referralLink); alert('Link copied!'); setShowMobileMenu(false) }}>
                🔗 Copy Referral Link
              </div>
              
              <div style={{ 
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px solid #252530'
              }}>
                <button 
                  onClick={() => { handleLogout(); setShowMobileMenu(false) }}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    background: '#ff4444',
                    border: 'none',
                    borderRadius: '100px',
                    color: 'white',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h1 style={styles.logo} onClick={() => navigate('/')}>
              🔷 THE MATRIX
            </h1>
            {isActiveMember && (
              <span style={styles.activeMemberBadge}>
                ⭐ ACTIVE MEMBER
              </span>
            )}
          </div>
          <div style={styles.headerRight}>
            <NotificationBell />
            <span style={styles.welcomeText}>Welcome, {userData?.name || 'User'}!</span>
            <button onClick={handleLogout} style={styles.logoutButton}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {showNotificationDropdown && <NotificationDropdown />}

      <div style={styles.mainContent}>
        
        {activeTab === 'dashboard' && quickStartStatus.eligible && !quickStartStatus.claimed && (
          <div style={{ background: 'linear-gradient(135deg, rgba(255,165,2,0.1), rgba(255,165,2,0.05))', padding: '16px', borderRadius: '16px', marginBottom: '24px', border: '1px solid #ffa502', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '24px' }}>🚀</span>
              <span style={{ color: '#ffa502', fontWeight: 'bold', fontSize: '16px', marginLeft: '8px' }}> Quick Start Bonus Available!</span>
              <p style={{ color: '#aaa', fontSize: '12px', marginTop: '5px', marginBottom: 0 }}>
                Complete your Level 1 within 7 days to claim 50,000 points
              </p>
              {quickStartStatus.daysRemaining > 0 && (
                <p style={{ color: '#ffa502', fontSize: '11px', marginTop: '3px', marginBottom: 0 }}>
                  ⏰ {quickStartStatus.daysRemaining} day{quickStartStatus.daysRemaining !== 1 ? 's' : ''} remaining
                </p>
              )}
            </div>
            <button 
              onClick={claimQuickStartBonus} 
              disabled={claimingBonus} 
              style={{ 
                padding: '10px 20px', 
                background: '#ffa502', 
                border: 'none', 
                borderRadius: '100px', 
                fontWeight: 'bold', 
                cursor: claimingBonus ? 'not-allowed' : 'pointer', 
                color: '#0d0d12'
              }}
            >
              {claimingBonus ? 'Claiming...' : 'Claim Bonus'}
            </button>
          </div>
        )}

        <div style={styles.tabContainer}>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            style={styles.tabButton(activeTab === 'dashboard', '#00ff88')}
          >
            📊 {!isMobile && 'Overview'}
          </button>
          
          <button 
            onClick={() => setActiveTab('matrices')} 
            style={styles.tabButton(activeTab === 'matrices', '#00ff88')}
          >
            🔷 {!isMobile && 'My Matrices'}
          </button>
          
          <button 
            onClick={() => setActiveTab('transactions')} 
            style={styles.tabButton(activeTab === 'transactions', '#00ff88')}
          >
            📜 {!isMobile && 'Transactions'}
          </button>
          
          {userData?.is_agent && (
            <button 
              onClick={() => setActiveTab('agent')} 
              style={styles.tabButton(activeTab === 'agent', '#9b59b6')}
            >
              🤝 {!isMobile && 'Agent'}
            </button>
          )}
        </div>

        {activeTab === 'dashboard' && (
          <>
            <div style={styles.grid4}>
              <div style={styles.statCard}>
                <h3 style={styles.statLabel}>Your Points</h3>
                <h2 style={styles.statValue}>{formatNumber(stats.master_points)}</h2>
              </div>
              <div style={styles.statCard}>
                <h3 style={styles.statLabel}>Commission Earned</h3>
                <h2 style={styles.statValue}>{formatNumber(stats.commission_earned)}</h2>
              </div>
              <div style={styles.statCard}>
                <h3 style={styles.statLabel}>Your Spots</h3>
                <h2 style={styles.statValue}>{userMatrices.length}</h2>
              </div>
              <div style={styles.statCard}>
                <h3 style={styles.statLabel}>Recovery Fund</h3>
                <h2 style={styles.statValue}>{formatNumber(stats.recovery_fund)}</h2>
              </div>
            </div>

            <div style={styles.actionCard}>
              <h2 style={styles.sectionTitle}>⚡ Your Actions</h2>
              
              <div style={{ marginBottom: '20px' }}>
                <p style={styles.statLabel}>Your Referral Code:</p>
                <code style={styles.codeBlock}>
                  {userData?.referral_code}
                </code>
                <button onClick={() => { navigator.clipboard.writeText(userData?.referral_code); alert('Copied!') }} style={styles.buttonSecondary}>
                  📋 Copy Code
                </button>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <p style={styles.statLabel}>Your Referral Link:</p>
                <code style={{ ...styles.codeBlock, fontSize: '12px' }}>
                  {referralLink}
                </code>
                <button onClick={() => { navigator.clipboard.writeText(referralLink); alert('Link copied!') }} style={styles.buttonPrimary}>
                  🔗 Copy Link
                </button>
              </div>
              
              <div style={styles.actionGrid}>
                <button onClick={() => setShowLoadModal(true)} style={styles.buttonPrimary}>
                  💰 Load Points
                </button>
                <button onClick={() => setShowCashoutModal(true)} style={styles.buttonWarning}>
                  💸 Cash Out
                </button>
                <button onClick={buySelfSponsored} disabled={buying} style={{ ...styles.buttonSuccess, opacity: buying ? 0.6 : 1 }}>
                  {buying ? 'Processing...' : '🔄 Buy Self-Sponsored'}
                </button>
                <button onClick={openTransferModal} style={styles.buttonPurple}>
                  💸 Transfer Points
                </button>
              </div>
              
              <button onClick={refreshAllData} style={{ ...styles.buttonSecondary, width: '100%' }}>
                🔄 Refresh Dashboard
              </button>
            </div>
          </>
        )}

        {activeTab === 'matrices' && (
          <div style={styles.actionCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ ...styles.sectionTitle, margin: 0 }}>📁 MY MATRICES</h2>
              <button onClick={loadUserMatrices} style={styles.buttonSecondary}>
                🔄 Refresh
              </button>
            </div>
            {userMatrices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#ffa502', marginBottom: '10px' }}>No matrices found</p>
                <p style={{ color: '#666', fontSize: '12px' }}>Buy a self-sponsored spot to create additional matrices</p>
              </div>
            ) : (
              <div>
                {userMatrices.map((m, idx) => renderMatrixVisualization(m))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div style={styles.actionCard}>
            <h2 style={styles.sectionTitle}>📜 Recent Transactions</h2>
            {transactions.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#aaa', padding: '40px' }}>No transactions yet</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.tableHeaderCell}>Date</th>
                      <th style={styles.tableHeaderCell}>Type</th>
                      <th style={styles.tableHeaderCell}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 20).map((tx, i) => (
                      <tr key={i} style={styles.tableRow}>
                        <td style={styles.tableCell}>{new Date(tx.timestamp).toLocaleDateString()}</td>
                        <td style={styles.tableCell}>{getTransactionDisplay(tx)}</td>
                        <td style={tx.amount > 0 ? styles.tableCellGreen : styles.tableCellRed}>
                          {tx.amount > 0 ? '+' : ''}{formatNumber(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'agent' && userData?.is_agent && (
          <AgentTab userId={userData.id} />
        )}

        {/* Footer - Standard across all pages */}
        <div style={{ textAlign: 'center', marginTop: '60px', padding: '20px', color: '#555', borderTop: '1px solid #333' }}>
          <p style={{ marginBottom: '8px', color: '#888', fontSize: 'clamp(11px, 3vw, 13px)' }}>Together We Will All Prosper</p>
          <p style={{ fontSize: 'clamp(11px, 3vw, 13px)' }}>
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

      {/* Load Points Modal */}
      {showLoadModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={{ color: '#00aaff', marginBottom: '16px' }}>💰 Load Points</h2>
            <p style={{ color: '#00ff88' }}>Your balance: <strong>{formatNumber(stats.master_points)} points</strong></p>
            <p style={{ color: '#aaa' }}>Rate: 200 points = $1 USD</p>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button 
                onClick={() => setLoadPaymentMethod('crypto')}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  background: loadPaymentMethod === 'crypto' ? '#00aaff' : '#252530',
                  border: 'none',
                  borderRadius: '100px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                💎 Crypto
              </button>
              <button 
                onClick={() => setLoadPaymentMethod('code')}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  background: loadPaymentMethod === 'code' ? '#00ff88' : '#252530',
                  border: 'none',
                  borderRadius: '100px',
                  color: loadPaymentMethod === 'code' ? '#0d0d12' : 'white',
                  cursor: 'pointer'
                }}
              >
                🎫 Activation Code
              </button>
            </div>
            
            {loadPaymentMethod === 'crypto' ? (
              <>
                <input 
                  type="number" 
                  placeholder="Points" 
                  value={loadAmount} 
                  onChange={e => setLoadAmount(e.target.value)} 
                  min="1000" 
                  style={styles.modalInput} 
                />
                {loadAmount && parseInt(loadAmount) >= 1000 && (
                  <p style={{ color: '#aaa', marginBottom: '15px' }}>Cost: ${(parseInt(loadAmount)/200).toFixed(2)} USD</p>
                )}
                <button 
                  onClick={() => {
                    navigate('/manual-crypto', { 
                      state: { 
                        type: 'purchase', 
                        userId: userData?.id,
                        pointsAmount: parseInt(loadAmount),
                        usdAmount: parseFloat(loadAmount) / 200
                      } 
                    })
                  }} 
                  disabled={!loadAmount || parseInt(loadAmount) < 1000}
                  style={{ ...styles.buttonPrimary, width: '100%', marginBottom: '10px', opacity: (!loadAmount || parseInt(loadAmount) < 1000) ? 0.6 : 1 }}
                >
                  Pay with Crypto (Manual)
                </button>
                <button onClick={() => { setShowLoadModal(false); setLoadAmount(''); setActivationCode('') }} style={{ ...styles.buttonSecondary, width: '100%' }}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <input 
                  type="text" 
                  placeholder="Enter activation code" 
                  value={activationCode} 
                  onChange={e => setActivationCode(e.target.value.toUpperCase())} 
                  style={styles.modalInput} 
                />
                <p style={{ color: '#888', fontSize: '11px', marginBottom: '15px' }}>
                  Each code is worth 50,000 points
                </p>
                <button onClick={handleRedeemCode} disabled={loadLoading || !activationCode} style={{ ...styles.buttonSuccess, width: '100%', marginBottom: '10px', opacity: (!activationCode || loadLoading) ? 0.6 : 1 }}>
                  {loadLoading ? 'Processing...' : 'Redeem Code'}
                </button>
                <button onClick={() => { setShowLoadModal(false); setLoadAmount(''); setActivationCode('') }} style={{ ...styles.buttonSecondary, width: '100%' }}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cashout Modal */}
      {showCashoutModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, borderColor: '#ffaa00' }}>
            <h2 style={{ color: '#ffaa00', marginBottom: '16px' }}>💸 Cash Out</h2>
            <p style={{ color: '#00ff88' }}>Balance: <strong>{formatNumber(stats.master_points)} points</strong> | Min: 20,000 | Fee: 1%</p>
            <input type="number" placeholder="Points" value={cashoutAmount} onChange={e => setCashoutAmount(e.target.value)} min="20000" style={styles.modalInput} />
            <select value={cashoutCryptoType} onChange={e => setCashoutCryptoType(e.target.value)} style={styles.modalSelect}><option>USDT</option><option>USDC</option></select>
            <input type="text" placeholder="Wallet Address" value={walletAddress} onChange={e => setWalletAddress(e.target.value)} style={styles.modalInput} />
            {cashoutAmount && parseInt(cashoutAmount) >= 20000 && (
              <div style={{ background: '#0d0d12', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
                <div style={{ color: '#fff' }}>Requested: {formatNumber(parseInt(cashoutAmount))}</div>
                <div style={{ color: '#ff6666' }}>Fee (1%): -{formatNumber(Math.floor(parseInt(cashoutAmount)*0.01))}</div>
                <div style={{ color: '#00ff88' }}>Net: {formatNumber(parseInt(cashoutAmount) - Math.floor(parseInt(cashoutAmount)*0.01))} points</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleSubmitCashout} disabled={cashoutLoading || !walletAddress || parseInt(cashoutAmount)<20000} style={{ ...styles.buttonWarning, flex: 1, opacity: (cashoutLoading || !walletAddress || parseInt(cashoutAmount)<20000) ? 0.6 : 1 }}>{cashoutLoading ? 'Processing...' : 'Request Cashout'}</button>
              <button onClick={() => { setShowCashoutModal(false); setCashoutAmount(''); setWalletAddress('') }} style={{ ...styles.buttonSecondary, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, borderColor: '#9b59b6' }}>
            <h2 style={{ color: '#9b59b6', marginBottom: '16px' }}>💸 Transfer Points</h2>
            <input type="text" placeholder="Search by email or referral code" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); if(e.target.value.length>=2) setTimeout(searchUsers,300); else setSearchResults([]) }} style={styles.modalInput} />
            {searchResults.map(u => <div key={u.id} onClick={() => selectRecipient(u)} style={{ padding: '10px', background: '#0d0d12', cursor: 'pointer', borderBottom: '1px solid #252530', color: '#fff' }}><div style={{ fontWeight: 'bold' }}>{u.referral_code}</div><div style={{ fontSize: '12px', color: '#888' }}>{u.email}</div></div>)}
            {selectedRecipient && <div style={{ margin: '10px 0', padding: '10px', background: '#0d0d12', borderRadius: '12px', color: '#fff' }}>Recipient: <strong style={{ color: '#00ff88' }}>{selectedRecipient.referral_code}</strong></div>}
            <input type="number" placeholder="Amount" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} style={styles.modalInput} />
            <input type="text" placeholder="Description (optional)" value={transferDescription} onChange={e => setTransferDescription(e.target.value)} style={styles.modalInput} />
            <p style={{ color: '#00ff88', fontSize: '12px', marginBottom: '16px' }}>Your balance: {formatNumber(stats.master_points)} points</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={openVerifyModal} disabled={!selectedRecipient || !transferAmount} style={{ ...styles.buttonPurple, flex: 1, opacity: (!selectedRecipient || !transferAmount) ? 0.6 : 1 }}>Continue</button>
              <button onClick={() => setShowTransferModal(false)} style={{ ...styles.buttonSecondary, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showVerifyModal && selectedRecipient && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, borderColor: '#ffa502' }}>
            <h2 style={{ color: '#ffa502', marginBottom: '16px' }}>🔐 Verify Transfer</h2>
            <div style={{ marginBottom: '20px', padding: '15px', background: '#0d0d12', borderRadius: '12px' }}>
              <p style={{ color: '#fff' }}>To: <strong style={{ color: '#00ff88' }}>{selectedRecipient.referral_code}</strong></p>
              <p style={{ color: '#fff' }}>Amount: <strong style={{ color: '#ffa502' }}>{formatNumber(parseInt(transferAmount))} points</strong></p>
            </div>
            <input type="password" placeholder="Your password" value={transferPassword} onChange={e => setTransferPassword(e.target.value)} style={styles.modalInput} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={confirmTransfer} disabled={transferLoading} style={{ ...styles.buttonWarning, flex: 1, opacity: transferLoading ? 0.6 : 1 }}>{transferLoading ? 'Processing...' : 'Confirm'}</button>
              <button onClick={() => { setShowVerifyModal(false); setTransferPassword('') }} style={{ ...styles.buttonSecondary, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showPromotionModal && activePromotion && (
        <div style={styles.modalOverlay}>
          <div style={{ background: '#16161f', padding: '32px', borderRadius: '20px', maxWidth: '500px', width: '90%', border: '2px solid #ffa502', position: 'relative' }}>
            <button onClick={() => { setShowPromotionModal(false); setActivePromotion(null) }} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '15px' }}>🎲</div>
            <h2 style={{ color: '#ffa502', textAlign: 'center', marginBottom: '10px' }}>{activePromotion.title}</h2>
            <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '20px' }}>{activePromotion.description}</p>
            <div style={{ background: '#0d0d12', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: '#888' }}>🏆 Prize:</span><span style={{ color: '#00ff88', fontWeight: 'bold' }}>{activePromotion.prize_description}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: '#888' }}>💰 Entry Cost:</span><span style={{ color: '#ffa502', fontWeight: 'bold' }}>{activePromotion.entry_cost.toLocaleString()} points</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ color: '#888' }}>📊 Total Entries:</span><span style={{ color: '#00ccff' }}>{activePromotion.total_entries || 0}</span></div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={enterPromotion} disabled={enteringPromotion} style={{ flex: 2, padding: '12px', background: enteringPromotion ? '#555' : '#ffa502', border: 'none', borderRadius: '100px', fontWeight: 'bold', cursor: enteringPromotion ? 'not-allowed' : 'pointer', color: '#0d0d12' }}>{enteringPromotion ? 'Processing...' : `Enter Raffle (${activePromotion.entry_cost.toLocaleString()} points)`}</button>
              <button onClick={() => { setShowPromotionModal(false); setActivePromotion(null) }} style={{ flex: 1, padding: '12px', background: '#252530', border: 'none', borderRadius: '100px', color: 'white', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 0, 0, 0.95)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowTermsModal(false)}>
          <div style={{ background: '#16161f', padding: '30px', borderRadius: '20px', maxWidth: '800px', width: '100%', maxHeight: '85vh', overflowY: 'auto', border: '2px solid #00ff88', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
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
            
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>How The Matrix Works</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>The Matrix is a community wealth-building platform where users acquire points to participate in a structured system that may generate commissions and contribute to a community fund.</p>
            
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>No Pyramid Scheme</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>The Matrix is NOT a pyramid scheme because:</p>
            <ul style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px', paddingLeft: '20px' }}>
              <li>No payment is required to participate</li>
              <li>Commissions are based on point purchases, not recruitment</li>
              <li>The matrix structure has built-in limits</li>
              <li>Auto-entry provides opportunities for all participants</li>
            </ul>
            
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>Risk Disclosure</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>By using The Matrix, you acknowledge and accept:</p>
            <ul style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px', paddingLeft: '20px' }}>
              <li>Points have no guaranteed cash value</li>
              <li>Commissions are not guaranteed</li>
              <li>The platform may evolve or change over time</li>
              <li>Technical issues, delays, or interruptions may occur</li>
              <li>You may lose the value of points you purchase</li>
              <li>Past performance does not indicate future results</li>
            </ul>
            
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>Eligibility</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>You must be at least 18 years old to use The Matrix. You are responsible for determining whether your participation complies with applicable laws in your jurisdiction.</p>
            
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>Prohibited Activities</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>You may not:</p>
            <ul style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px', paddingLeft: '20px' }}>
              <li>Use the platform for any illegal purpose</li>
              <li>Manipulate or exploit the matrix structure</li>
              <li>Create multiple accounts</li>
              <li>Engage in fraudulent or deceptive practices</li>
              <li>Promote The Matrix as an "investment opportunity"</li>
            </ul>
            
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>Termination</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>We reserve the right to suspend or terminate accounts that violate these Terms.</p>
            
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>Limitation of Liability</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>To the maximum extent permitted by law, The Matrix shall not be liable for any indirect, incidental, or consequential damages.</p>
            
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>Changes to Terms</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>We may update these Terms from time to time. Continued use of the platform constitutes acceptance of updated Terms.</p>
            
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>Contact</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>For questions about these Terms, contact: legal@the-matrix.app</p>
            
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>Governing Law</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>These Terms shall be governed by the laws of Barbados.</p>
            
            <p style={{ color: '#00ff88', fontSize: '14px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #333' }}>BY USING THE MATRIX, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO THESE TERMS.</p>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 0, 0, 0.95)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowPrivacyModal(false)}>
          <div style={{ background: '#16161f', padding: '30px', borderRadius: '20px', maxWidth: '700px', width: '100%', maxHeight: '85vh', overflowY: 'auto', border: '2px solid #00ff88', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
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
            
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>How We Use Your Information</h2>
            <ul style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px', paddingLeft: '20px' }}>
              <li>To operate and improve the platform</li>
              <li>To process transactions</li>
              <li>To communicate important updates</li>
              <li>To comply with legal obligations</li>
            </ul>
            
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>Data Sharing</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>We do not sell your personal information. We may share data:</p>
            <ul style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px', paddingLeft: '20px' }}>
              <li>With service providers (Supabase, Vercel, NowPayments)</li>
              <li>When required by law</li>
              <li>To protect our rights and safety</li>
            </ul>
            
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>Your Rights</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>You may request:</p>
            <ul style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px', paddingLeft: '20px' }}>
              <li>Access to your data</li>
              <li>Correction of inaccurate data</li>
              <li>Deletion of your account</li>
            </ul>
            
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>Data Retention</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>We retain your data as long as your account is active or as needed to provide services.</p>
            
            <h2 style={{ color: '#00ccff', fontSize: '20px', marginBottom: '10px' }}>Contact</h2>
            <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>Privacy questions: hello@the-matrix.app</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserDashboard