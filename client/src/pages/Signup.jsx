// client/src/pages/Signup.jsx
// THE MATRIX V5.0 - Complete with Manual Crypto Payment

import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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

function Signup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlReferralCode = searchParams.get('ref')
  const resumeParam = searchParams.get('resume')
  const messageParam = searchParams.get('message')
  
  const [name, setName] = useState('')
  const [alias, setAlias] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [referralCode, setReferralCode] = useState(urlReferralCode || '')
  const [randomAssign, setRandomAssign] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(messageParam || null)
  const [step, setStep] = useState('form')
  const [showTermsModal, setShowTermsModal] = useState(false)
  
  // Payment method state
  const [activationCode, setActivationCode] = useState('')
  const [cryptoInvoice, setCryptoInvoice] = useState(null)
  const [pendingSignupId, setPendingSignupId] = useState(null)
  const [countdown, setCountdown] = useState({ formatted: '00:00:00', seconds: 0 })
  const [cancelling, setCancelling] = useState(false)

  const CREATE_ACTIVATE_URL = `${SUPABASE_URL}/functions/v1/create-activate-user`
  const SIGNUP_URL = `${SUPABASE_URL}/functions/v1/signup`
  const VALIDATE_CODE_URL = `${SUPABASE_URL}/functions/v1/validate-activation-code`

  const hasReferralCode = referralCode && referralCode.trim() !== ''

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  useEffect(() => {
    if (hasReferralCode && randomAssign) {
      setRandomAssign(false)
    }
  }, [referralCode])

  // Resume pending signup
  useEffect(() => {
    const resumePending = async () => {
      if (resumeParam === 'true') {
        console.log('Resume flow triggered')
        
        let savedPendingId = localStorage.getItem('pendingSignupId')
        let savedExpiresAt = localStorage.getItem('pendingExpiresAt')
        
        if (!savedPendingId) {
          console.log('No pending in localStorage, checking backend...')
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/create-activate-user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'getPendingStatus',
                data: { userId: session.user.id }
              })
            })
            const result = await response.json()
            if (result.hasPending && result.status === 'pending') {
              savedPendingId = result.pendingSignupId
              savedExpiresAt = result.expiresAt
              localStorage.setItem('pendingSignupId', savedPendingId)
              localStorage.setItem('pendingExpiresAt', savedExpiresAt)
              console.log('Found pending in backend:', savedPendingId)
            }
          }
        }
        
        if (savedPendingId && savedExpiresAt) {
          const expiresAt = new Date(savedExpiresAt)
          if (expiresAt > new Date()) {
            setPendingSignupId(savedPendingId)
            setStep('payment_method')
            const diff = Math.max(0, Math.floor((expiresAt - new Date()) / 1000))
            setCountdown({
              formatted: formatTimeHelper(diff),
              seconds: diff
            })
            console.log('Resume successful, step set to payment_method')
          } else {
            localStorage.removeItem('pendingSignupId')
            localStorage.removeItem('pendingExpiresAt')
            setError('Your previous registration has expired. Please sign up again.')
            setStep('form')
          }
        } else {
          setError('No pending registration found. Please sign up.')
          setStep('form')
        }
      }
    }
    
    resumePending()
  }, [resumeParam])

  // Countdown timer
  useEffect(() => {
    let interval = null
    
    if (step === 'payment_method' && countdown.seconds > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev.seconds <= 1) {
            clearInterval(interval)
            return { formatted: '00:00:00', seconds: 0 }
          }
          const newSeconds = prev.seconds - 1
          return {
            formatted: formatTimeHelper(newSeconds),
            seconds: newSeconds
          }
        })
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [step, countdown.seconds])

  const createPendingSignup = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }

    if (!termsAccepted) {
      setError('You must accept the Terms and Conditions')
      return false
    }

    if (!hasReferralCode && !randomAssign) {
      setError('Please enter a referral code or check random assignment')
      return false
    }

    try {
      setLoading(true)
      console.log('Calling SIGNUP_URL with referralCode:', hasReferralCode ? referralCode : null)
      
      const response = await fetch(SIGNUP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          alias: alias || name,
          referralCode: hasReferralCode ? referralCode : null
        })
      })

      const result = await response.json()
      console.log('Signup result:', result)

      if (!result.success) {
        setError(result.error)
        setLoading(false)
        return false
      }

      setPendingSignupId(result.pendingSignupId)
      
      localStorage.setItem('pendingSignupId', result.pendingSignupId)
      localStorage.setItem('pendingExpiresAt', result.expiresAt)
      console.log('Saved to localStorage - pendingSignupId:', result.pendingSignupId)
      
      if (result.expiresAt) {
        const expiresAt = new Date(result.expiresAt)
        const now = new Date()
        const diff = Math.max(0, Math.floor((expiresAt - now) / 1000))
        setCountdown({
          formatted: formatTimeHelper(diff),
          seconds: diff
        })
      }
      
      setLoading(false)
      return true

    } catch (err) {
      console.error('Signup error:', err)
      setError('Error creating account: ' + err.message)
      setLoading(false)
      return false
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    
    if (loading) return
    
    const success = await createPendingSignup()
    
    if (success) {
      setStep('payment_method')
    }
  }

  // Manual Crypto Payment - Navigate to shared page
  const handleManualCrypto = () => {
    navigate('/manual-crypto', { 
      state: { 
        type: 'registration', 
        pendingSignupId: pendingSignupId,
        usdAmount: 250
      } 
    })
  }

  const handleActivationCode = async () => {
    if (!activationCode.trim()) {
      setError('Please enter your activation code')
      return
    }

    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(VALIDATE_CODE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activationCode,
          pendingSignupId: pendingSignupId
        })
      })

      const result = await response.json()

      if (result.success) {
        localStorage.removeItem('pendingSignupId')
        localStorage.removeItem('pendingExpiresAt')
        setStep('success')
        setTimeout(() => {
          window.location.href = '/login?message=Activation+successful!+Please+login.'
        }, 3000)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Error validating activation code')
    } finally {
      setLoading(false)
    }
  }

  const handleTransferRequest = async () => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const { data: pending, error: pendingError } = await supabase
        .from('pending_signups')
        .select('referrer_user_id')
        .eq('id', pendingSignupId)
        .single()

      if (pendingError) {
        setError('Could not find your pending registration')
        setLoading(false)
        return
      }

      if (pending?.referrer_user_id) {
        await supabase.from('notifications').insert({
          user_id: pending.referrer_user_id,
          type: 'transfer_request',
          title: '🎁 Points Transfer Request',
          message: `A new user (${alias || name}) has requested 50,000 points to activate their matrix spot.`,
          action_data: {
            action: 'approve_transfer',
            pending_signup_id: pendingSignupId,
            amount: 50000,
            requester_alias: alias || name,
            requester_email: email
          },
          created_at: new Date().toISOString()
        })

        localStorage.removeItem('pendingSignupId')
        localStorage.removeItem('pendingExpiresAt')
        setStep('success')
        setTimeout(() => {
          window.location.href = '/login?message=Request+sent!+Your+referrer+will+transfer+points+to+activate+your+account.'
        }, 3000)
      } else {
        setError('No referrer found. Please use crypto payment or activation code.')
      }
    } catch (err) {
      setError('Error sending transfer request')
    } finally {
      setLoading(false)
    }
  }

  const cancelRegistration = async () => {
    if (!confirm('Are you sure you want to cancel your registration? Your reserved spot will be released.')) return

    setCancelling(true)
    setError(null)

    try {
      const response = await fetch(CREATE_ACTIVATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancelPending',
          data: { pendingSignupId }
        })
      })

      const result = await response.json()

      if (result.success) {
        localStorage.removeItem('pendingSignupId')
        localStorage.removeItem('pendingExpiresAt')
        await supabase.auth.signOut()
        window.location.href = '/signup?message=Registration+cancelled.+You+can+re-register+anytime.'
      } else {
        setError(result.error)
        setCancelling(false)
      }
    } catch (err) {
      setError('Error cancelling registration')
      setCancelling(false)
    }
  }

  const goBackToForm = () => {
    setStep('form')
    setActivationCode('')
    setError(null)
    setCryptoInvoice(null)
  }

  const renderSignupForm = () => (
    <form onSubmit={handleSignup}>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Full Name (Private)</label>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          required 
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #00ccff', background: '#0a0a2a', color: 'white' }} 
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Alias (Public Display Name)</label>
        <input 
          type="text" 
          value={alias} 
          onChange={(e) => setAlias(e.target.value)} 
          required 
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #00ccff', background: '#0a0a2a', color: 'white' }} 
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Email</label>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #00ccff', background: '#0a0a2a', color: 'white' }} 
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Password</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #00ccff', background: '#0a0a2a', color: 'white' }} 
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Confirm Password</label>
        <input 
          type="password" 
          value={confirmPassword} 
          onChange={(e) => setConfirmPassword(e.target.value)} 
          required 
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #00ccff', background: '#0a0a2a', color: 'white' }} 
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ color: '#aaa', display: 'block', marginBottom: '5px' }}>Referred By (Referral Code)</label>
        <input 
          type="text" 
          value={referralCode} 
          onChange={(e) => setReferralCode(e.target.value)} 
          placeholder="Enter referral code (if you have one)" 
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ffa502', background: '#0a0a2a', color: 'white' }} 
        />
        {urlReferralCode && <p style={{ color: '#00ff88', fontSize: '12px', marginTop: '5px' }}>✅ Referral code from link: {urlReferralCode}</p>}
      </div>

      {!hasReferralCode && (
        <div style={{ marginBottom: '15px', background: 'rgba(255,165,0,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid #ffa502' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#ffa502' }}>
            <input 
              type="checkbox" 
              checked={randomAssign} 
              onChange={(e) => setRandomAssign(e.target.checked)} 
              style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }} 
            />
            <span>⚠️ I don't have a referral code (Random Assignment)</span>
          </label>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={termsAccepted} 
            onChange={(e) => setTermsAccepted(e.target.checked)} 
            style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }} 
          />
          <span style={{ color: '#aaa' }}>I agree to the <span onClick={(e) => { e.preventDefault(); setShowTermsModal(true) }} style={{ color: '#00ccff', cursor: 'pointer', textDecoration: 'underline' }}>Terms & Conditions</span></span>
        </label>
      </div>

      {error && <div style={{ background: '#ff4444', color: 'white', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>{error}</div>}
      {successMessage && <div style={{ background: '#00ff88', color: '#0a0a2a', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>{successMessage}</div>}

      <button 
        type="submit" 
        disabled={loading || !termsAccepted} 
        style={{ 
          width: '100%', 
          padding: '12px', 
          background: (!termsAccepted || loading) ? '#555' : 'linear-gradient(135deg, #00ccff, #00ff88)', 
          border: 'none', 
          borderRadius: '5px', 
          fontWeight: 'bold', 
          cursor: (!termsAccepted || loading) ? 'not-allowed' : 'pointer', 
          color: '#0a0a2a', 
          fontSize: '16px' 
        }}
      >
        {loading ? 'Creating Account...' : 'Continue to Payment'}
      </button>
    </form>
  )

  const renderPaymentMethodSelection = () => {
    const isExpired = countdown.seconds <= 0

    return (
      <div>
        <button onClick={goBackToForm} style={{ background: 'transparent', border: 'none', color: '#00ccff', cursor: 'pointer', marginBottom: '20px', fontSize: '14px' }}>
          ← Back to Signup
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>⏳</div>
          <h2 style={{ color: '#ffa502' }}>Payment Required</h2>
          <p style={{ color: '#aaa' }}>Complete payment within 24 hours to secure your spot</p>
          <div style={{ background: '#0a0a2a', padding: '15px', borderRadius: '10px', marginTop: '15px' }}>
            <p style={{ color: '#00ff88', fontSize: '32px', fontWeight: 'bold', margin: 0 }}>{countdown.formatted}</p>
            <p style={{ color: '#888', fontSize: '12px', marginTop: '5px' }}>Time remaining</p>
          </div>
          {isExpired && (
            <p style={{ color: '#ff4444', marginTop: '10px' }}>⚠️ Your reservation has expired. Please re-register.</p>
          )}
        </div>

        {!isExpired && (
          <>
            {/* Manual Crypto Option */}
            <div 
              onClick={handleManualCrypto} 
              style={{ border: '2px solid #ffa502', borderRadius: '12px', padding: '20px', marginBottom: '15px', background: '#0a0a2a', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '32px' }}>💎</span>
                <div>
                  <h3 style={{ color: '#ffa502', marginBottom: '5px' }}>Pay with Crypto (Manual)</h3>
                  <p style={{ color: '#aaa', fontSize: '12px' }}>$250 USDT • Admin review required</p>
                </div>
              </div>
            </div>

            {/* Activation Code Option */}
            <div style={{ border: '2px solid #00ff88', borderRadius: '12px', padding: '20px', marginBottom: '15px', background: '#0a0a2a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '32px' }}>🎫</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: '#00ff88', marginBottom: '5px' }}>Enter Activation Code</h3>
                  <p style={{ color: '#aaa', fontSize: '12px' }}>Purchase from an authorized agent</p>
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <input 
                  type="text" 
                  placeholder="MATRIX-XXXX-XXXX-XXXX" 
                  value={activationCode} 
                  onChange={(e) => setActivationCode(e.target.value.toUpperCase())} 
                  style={{ width: '100%', padding: '12px', background: '#0a0a2a', color: 'white', border: '1px solid #00ff88', borderRadius: '8px', marginBottom: '10px' }} 
                />
                <button 
                  onClick={handleActivationCode} 
                  disabled={loading || !activationCode} 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: (!activationCode || loading) ? '#555' : '#00ff88', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontWeight: 'bold', 
                    cursor: (!activationCode || loading) ? 'not-allowed' : 'pointer', 
                    color: '#0a0a2a' 
                  }}
                >
                  {loading ? 'Processing...' : 'Activate Now'}
                </button>
              </div>
            </div>

            {/* Points Transfer Request Option */}
            <div 
              onClick={handleTransferRequest} 
              style={{ border: '2px solid #00ccff', borderRadius: '12px', padding: '20px', marginBottom: '15px', background: '#0a0a2a', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '32px' }}>🔄</span>
                <div>
                  <h3 style={{ color: '#00ccff', marginBottom: '5px' }}>Request Points Transfer</h3>
                  <p style={{ color: '#aaa', fontSize: '12px' }}>Ask your referrer to transfer 50,000 points</p>
                </div>
              </div>
            </div>

            {/* Bank Transfer (Coming Soon) */}
            <div style={{ border: '2px solid #555', borderRadius: '12px', padding: '20px', background: '#1a1a3a', opacity: 0.6, cursor: 'not-allowed' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '32px' }}>🏦</span>
                <div>
                  <h3 style={{ color: '#888', marginBottom: '5px' }}>Bank Transfer</h3>
                  <p style={{ color: '#888', fontSize: '12px' }}>Coming soon</p>
                </div>
              </div>
            </div>
          </>
        )}

        <button 
          onClick={cancelRegistration} 
          disabled={cancelling} 
          style={{ 
            width: '100%', 
            padding: '12px', 
            marginTop: '20px', 
            background: '#333', 
            border: 'none', 
            borderRadius: '8px', 
            color: '#ff6666', 
            cursor: cancelling ? 'not-allowed' : 'pointer' 
          }}
        >
          {cancelling ? 'Cancelling...' : 'Cancel Registration'}
        </button>

        {error && <div style={{ background: '#ff4444', color: 'white', padding: '10px', borderRadius: '5px', marginTop: '15px' }}>{error}</div>}
      </div>
    )
  }

  const renderSuccess = () => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎉</div>
      <h2 style={{ color: '#00ff88', marginBottom: '15px' }}>Almost There!</h2>
      <p style={{ color: '#aaa' }}>Your request has been processed. You will be redirected shortly.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#1a1a3a', padding: '30px', borderRadius: '10px', width: '100%', maxWidth: '550px', border: step === 'payment_method' ? '1px solid #ffa502' : '1px solid #00ff88' }}>
        <h1 style={{ color: step === 'payment_method' ? '#ffa502' : '#00ff88', textAlign: 'center', marginBottom: '20px' }}>🔷 Join The Matrix</h1>
        
        {step === 'form' && renderSignupForm()}
        {step === 'payment_method' && renderPaymentMethodSelection()}
        {step === 'success' && renderSuccess()}

        {step === 'form' && (
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <Link to="/login" style={{ color: '#00ccff', textDecoration: 'none' }}>Already have an account? Login</Link>
          </div>
        )}
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#1a1a3a', padding: '30px', borderRadius: '20px', maxWidth: '700px', width: '100%', maxHeight: '80vh', overflow: 'auto', border: '2px solid #00ff88', position: 'relative' }}>
            <button onClick={() => setShowTermsModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            <h2 style={{ color: '#00ff88', marginBottom: '20px' }}>📜 Terms & Conditions</h2>
            <div style={{ color: '#ccc', lineHeight: '1.8' }}>
              <h3 style={{ color: '#00ccff', marginBottom: '10px' }}>1. Membership</h3>
              <p>By joining The Matrix, you agree to participate in a community wealth-building platform.</p>
              <h3 style={{ color: '#00ccff', marginBottom: '10px' }}>2. Points System</h3>
              <p>Points are the internal currency of The Matrix. 200 points = $1 USD value.</p>
              <h3 style={{ color: '#00ccff', marginBottom: '10px' }}>3. Commissions</h3>
              <p>Level 1 (25%) to referrer, Level 2 (25%) to grandparent, Level 3 (25%) to great-grandparent.</p>
              <h3 style={{ color: '#00ccff', marginBottom: '10px' }}>4. Recovery Fund</h3>
              <p>20% of every entry goes to the community Recovery Fund.</p>
              <h3 style={{ color: '#00ccff', marginBottom: '10px' }}>5. Admin Fee</h3>
              <p>5% of every entry goes to platform operations and development.</p>
              <h3 style={{ color: '#00ccff', marginBottom: '10px' }}>6. Contact</h3>
              <p>hello@the-matrix.app</p>
            </div>
            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <button onClick={() => setShowTermsModal(false)} style={{ padding: '12px 30px', background: '#00ff88', border: 'none', borderRadius: '5px', color: '#0a0a2a', fontWeight: 'bold', cursor: 'pointer' }}>I Understand</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Signup