// client/src/pages/LandingPage.jsx
// THE MATRIX V5.0 - Professional Clean Design | Original Content Preserved

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

function LandingPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [referralBanner, setReferralBanner] = useState({ show: false, code: '' })
  const [activeModal, setActiveModal] = useState(null)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [isLaunched, setIsLaunched] = useState(false)
  
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  
  const [slideIndex, setSlideIndex] = useState(0)
  const [fade, setFade] = useState(true)

  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [waitlistName, setWaitlistName] = useState('')
  const [waitlistAlias, setWaitlistAlias] = useState('')
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistPassword, setWaitlistPassword] = useState('')
  const [waitlistConfirmPassword, setWaitlistConfirmPassword] = useState('')
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistResult, setWaitlistResult] = useState(null)

  const LAUNCH_DATE = new Date('2026-06-01T00:00:00')

  const slides = [
    { icon: '🚀', title: 'Coming Soon!' },
    { icon: '📊', title: 'Live Stats' },
    { icon: '🎲', title: 'Raffles' },
    { icon: '🏆', title: 'Bonuses' },
    { icon: '🛍️', title: 'Shop with Points' },
    { icon: '💳', title: 'CrediPoints' }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setSlideIndex((prev) => (prev + 1) % slides.length)
        setFade(true)
      }, 300)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const params = new URLSearchParams(window.location.search)
    const refCode = params.get('ref')
    
    if (refCode) {
      localStorage.setItem('pendingReferral', refCode)
      setReferralBanner({ show: true, code: refCode })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  const updateCountdown = () => {
    const now = new Date()
    const diff = LAUNCH_DATE - now

    if (diff <= 0) {
      setIsLaunched(true)
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      return
    }

    setCountdown({
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000)
    })
    setIsLaunched(false)
  }

  // ============================================
  // MODIFIED: Added session check at the beginning
  // ============================================
  const handleMainTileClick = () => {
    const pendingRef = localStorage.getItem('pendingReferral')
    
    // NEW: If user is already logged in, redirect to appropriate dashboard
    if (session) {
      if (isLaunched) {
        navigate('/dashboard')
      } else {
        navigate('/waitlist')
      }
      return
    }
    
    // Original logic continues below (unchanged)
    if (isLaunched) {
      if (pendingRef) {
        navigate(`/signup?ref=${pendingRef}`)
        localStorage.removeItem('pendingReferral')
      } else {
        navigate('/login')
      }
    } else {
      if (pendingRef) {
        sessionStorage.setItem('waitlistReferralCode', pendingRef)
      }
      setShowWaitlistModal(true)
    }
  }

  // ============================================
  // NEW: Handle login button click with session check
  // ============================================
  const handleLoginClick = () => {
    if (session) {
      // Already logged in, redirect to appropriate dashboard
      if (isLaunched) {
        navigate('/dashboard')
      } else {
        navigate('/waitlist')
      }
    } else {
      navigate('/login')
    }
  }

  // ============================================
  // NEW: Handle signup button click with session check
  // ============================================
  const handleSignupClick = () => {
    if (session) {
      // Already logged in, redirect to appropriate dashboard
      if (isLaunched) {
        navigate('/dashboard')
      } else {
        navigate('/waitlist')
      }
    } else {
      navigate('/signup')
    }
  }

  const handleDismissBanner = () => {
    setReferralBanner({ show: false, code: '' })
  }

  const handleJoinWaitlist = async () => {
    if (!waitlistName || !waitlistAlias || !waitlistEmail || !waitlistPassword) {
      alert('Please enter your name, alias, email, and password')
      return
    }

    if (waitlistPassword !== waitlistConfirmPassword) {
      alert('Passwords do not match')
      return
    }

    if (waitlistPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    setWaitlistLoading(true)
    try {
      let refCode = sessionStorage.getItem('waitlistReferralCode')
      if (!refCode) {
        const urlParams = new URLSearchParams(window.location.search)
        refCode = urlParams.get('ref')
      }
      
      if (refCode) {
        sessionStorage.removeItem('waitlistReferralCode')
      }
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: waitlistEmail,
        password: waitlistPassword,
        options: {
          data: {
            name: waitlistName,
            alias: waitlistAlias,
            account_status: 'waitlist'
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create account')

      const response = await fetch(`${SUPABASE_URL}/functions/v1/join-waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: waitlistName,
          alias: waitlistAlias,
          email: waitlistEmail,
          referralCode: refCode || null,
          userId: authData.user.id
        })
      })

      const result = await response.json()
      
      if (result.success) {
        localStorage.removeItem('pendingReferral')
        sessionStorage.removeItem('waitlistReferralCode')
        setWaitlistResult(result)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      alert('Error joining waitlist: ' + error.message)
    } finally {
      setWaitlistLoading(false)
    }
  }

  const formatNumber = (num) => String(num).padStart(2, '0')

  // ============================================
  // MODAL CONTENT - YOUR ORIGINAL CONTENT (unchanged)
  // ============================================

  const renderModalContent = () => {
    switch (activeModal) {
      case 'about':
        return (
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#00ff88', marginBottom: '16px', fontSize: '22px' }}>ℹ️ About The Matrix</h2>
            <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px', fontStyle: 'italic', lineHeight: '1.6' }}>
              "More than an app. A vehicle for community wealth building."
            </p>
            <h3 style={{ color: '#00ccff', marginBottom: '10px', fontSize: '18px' }}>Our Mission</h3>
            <p style={{ color: 'white', marginBottom: '20px', fontSize: '16px', fontWeight: 'bold' }}>
              "Together We Will All Prosper"
            </p>
            <h3 style={{ color: '#00ccff', marginBottom: '10px', fontSize: '18px' }}>What We Are</h3>
            <p style={{ color: '#ccc', marginBottom: '20px', lineHeight: '1.6', fontSize: '14px' }}>
              A community-focused platform where participants help build collective wealth through a structured, transparent system.
            </p>
            <h3 style={{ color: '#00ccff', marginBottom: '10px', fontSize: '18px' }}>The Opportunity</h3>
            <p style={{ color: '#ccc', marginBottom: '20px', lineHeight: '1.6', fontSize: '14px' }}>
              We believe communities can prosper together when given the right tools and incentives. The Matrix is designed to align individual success with community growth.
            </p>
          </div>
        )
      case 'ethos':
        return (
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#00ff88', marginBottom: '16px', fontSize: '22px' }}>📜 Our Ethos & Journey</h2>
            <h3 style={{ color: '#00ccff', marginBottom: '10px', fontSize: '18px' }}>Our Belief</h3>
            <p style={{ color: '#ccc', marginBottom: '20px', lineHeight: '1.6', fontSize: '14px' }}>Wealth should be built together, not extracted from each other.</p>
            <h3 style={{ color: '#00ccff', marginBottom: '10px', fontSize: '18px' }}>The Principles That Guide Us</h3>
            <ul style={{ color: '#ccc', marginBottom: '20px', lineHeight: '1.8', fontSize: '14px', paddingLeft: '20px' }}>
              <li><strong style={{ color: '#00ff88' }}>Transparency:</strong> Every transaction is visible and auditable.</li>
              <li><strong style={{ color: '#00ff88' }}>Fairness:</strong> The same rules apply to everyone.</li>
              <li><strong style={{ color: '#00ff88' }}>Regeneration:</strong> The Recovery Fund fuels ongoing community growth.</li>
              <li><strong style={{ color: '#00ff88' }}>Opportunity:</strong> Everyone gets a chance, even without recruiting.</li>
            </ul>
            <h3 style={{ color: '#00ccff', marginBottom: '10px', fontSize: '18px' }}>The Journey</h3>
            <p style={{ color: '#ccc', marginBottom: '10px', lineHeight: '1.6', fontSize: '14px' }}><strong>Launch Date:</strong> June 1, 2026</p>
            <p style={{ color: '#ccc', marginBottom: '20px', lineHeight: '1.6', fontSize: '14px' }}><strong>Vision:</strong> Build a self-sustaining community-owned ecosystem</p>
          </div>
        )
      case 'howItWorks':
        return (
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#00ff88', marginBottom: '16px', fontSize: '22px' }}>🧮 How The Matrix Works</h2>
            <h3 style={{ color: '#00ccff', marginBottom: '10px', fontSize: '18px' }}>The Structure</h3>
            <p style={{ color: '#ccc', marginBottom: '20px', lineHeight: '1.6', fontSize: '14px' }}>A balanced matrix design that rewards participation while maintaining long-term sustainability.</p>
            <h3 style={{ color: '#00ccff', marginBottom: '10px', fontSize: '18px' }}>Entry</h3>
            <p style={{ color: '#ccc', marginBottom: '20px', lineHeight: '1.6', fontSize: '14px' }}>Participants acquire points to secure their position in the matrix.</p>
            <h3 style={{ color: '#00ccff', marginBottom: '10px', fontSize: '18px' }}>Earning Potential</h3>
            <p style={{ color: '#ccc', marginBottom: '20px', lineHeight: '1.6', fontSize: '14px' }}>Earnings are distributed through a multi-level structure that rewards contribution to the community.</p>
            <h3 style={{ color: '#00ccff', marginBottom: '10px', fontSize: '18px' }}>Community Pool</h3>
            <p style={{ color: '#ccc', marginBottom: '20px', lineHeight: '1.6', fontSize: '14px' }}>A portion of every transaction flows into a community-owned fund used to support ongoing growth and provide auto-entry opportunities.</p>
            <h3 style={{ color: '#00ccff', marginBottom: '10px', fontSize: '18px' }}>Sustainable by Design</h3>
            <p style={{ color: '#ccc', marginBottom: '20px', lineHeight: '1.6', fontSize: '14px' }}>The system includes multiple safeguards including balanced width limits, depth caps, and automatic overflow mechanisms.</p>
          </div>
        )
      case 'help':
        return (
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#00ff88', marginBottom: '20px', fontSize: '22px' }}>📚 Help & FAQs</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>1. Is this a pyramid scheme?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>
                Absolutely not. The Matrix is a community wealth-building platform, akin to how a co-operative functions. 
                We've engineered out the predatory mechanics and replaced them with transparency, fairness, and shared ownership. 
                Matrix positions are digital assets with utility (point earnings, shop access, asset ownership); and you NEVER have to recruit/refer anyone if you don't want to.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>2. What is a "sub-root"?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>
                Every spot (absolute position) you own is the root of its own 85‑spot sub‑matrix. 
                This sub‑matrix is used for commission calculations on entries placed under you.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>3. How do I earn commissions?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>
                You earn from point purchases made within your 3‑level downline (your direct referrals, their referrals, and their referrals). 
                The exact breakdown is displayed in every transaction in your dashboard.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>4. What is the Recovery Fund?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>
                A community‑owned capital pool funded by each and every purchase. 
                It will eventually be used to acquire assets (digital, real estate, businesses) that benefit all members.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>5. What are "CrediPoints"?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>
                A future digital benefit; details will be announced as the feature develops.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>6. Can I move up the waitlist?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>
                Yes, your position can be improved by referring new members. Each time someone joins using your waitlist link, you are rewarded by advancing one spot ahead.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>7. What happens after June 1, 2026?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>
                The live Matrix system launches. Waitlist positions are converted into matrix spots, 
                and you can then buy points, earn commissions, and use the platform.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>8. Can I lose points?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>
                Points have no guaranteed cash value. You may lose the value of points you purchase, and commissions are not guaranteed. 
                The system is a digital asset, not an investment.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>9. What is the "Auto-Entry" feature?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>
                A mechanism that gives non‑recruiters a chance to receive commissions through the Recovery Fund, 
                ensuring that everyone has an opportunity to participate.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>10. How do I get an activation code?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>
                Activation codes function similar to gift cards. They're worth 50,000 points and are only available through authorised agents. 
                Contact support via email or engage an agent to purchase one. Agents are accessible via the WhatsApp link below.
              </p>
            </div>

            <div style={{ background: '#0a0a2a', padding: '20px', borderRadius: '10px', marginTop: '20px', textAlign: 'center' }}>
              <p style={{ color: '#00ff88', marginBottom: '15px', fontSize: '16px' }}>📧 Need more help?</p>
              <p style={{ color: '#aaa', marginBottom: '15px' }}>Email us: <a href="mailto:hello@the-matrix.app" style={{ color: '#00ccff' }}>hello@the-matrix.app</a></p>
              <a
                href="https://chat.whatsapp.com/IMRG4tKz9K6G2DntpdnVvu"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#25D366',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '50px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  marginTop: '5px'
                }}
              >
                <span>📱</span> Join our WhatsApp Group
              </a>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const currentSlide = slides[slideIndex]

  // ============================================
  // CLEAN STYLES - Only styling, no content changes
  // ============================================

  const styles = {
    container: {
      minHeight: '100vh',
      background: '#0d0d12',
      padding: '24px',
    },
    content: {
      maxWidth: '1200px',
      margin: '0 auto',
    },
    header: {
      textAlign: 'center',
      marginBottom: '48px',
    },
    logo: {
      color: '#00ff88',
      fontSize: 'clamp(32px, 8vw, 48px)',
      marginBottom: '8px',
      letterSpacing: '-0.02em',
    },
    tagline: {
      color: '#666',
      fontSize: 'clamp(14px, 4vw, 18px)',
    },
    grid: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '20px',
      marginBottom: '60px',
    },
    card: {
      background: '#16161f',
      padding: '24px',
      borderRadius: '16px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      flex: '1 1 calc(50% - 20px)',
      minWidth: 'calc(50% - 20px)',
      maxWidth: '350px',
      border: '1px solid #252530',
    },
    cardHover: {
      transform: 'translateY(-4px)',
      borderColor: '#00ff88',
      boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
    },
    cardNoHover: {
      background: '#16161f',
      padding: '24px',
      borderRadius: '16px',
      textAlign: 'center',
      flex: '1 1 calc(50% - 20px)',
      minWidth: 'calc(50% - 20px)',
      maxWidth: '350px',
      border: '1px solid #252530',
      transition: 'all 0.2s ease',
    },
    cardNoHoverHover: {
      transform: 'translateY(-4px)',
      borderColor: '#00ff88',
      boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
    },
    icon: {
      fontSize: 'clamp(32px, 8vw, 42px)',
      marginBottom: '12px',
    },
    cardTitle: {
      color: '#fff',
      fontSize: 'clamp(18px, 5vw, 22px)',
      marginBottom: '4px',
    },
    countdownCard: {
      background: 'linear-gradient(135deg, #16161f, #0d0d12)',
      padding: '32px',
      borderRadius: '16px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      flex: '1 1 calc(50% - 20px)',
      minWidth: 'calc(50% - 20px)',
      maxWidth: '350px',
      border: '1px solid #00ff88',
    },
    timerBox: {
      background: '#0d0d12',
      padding: '12px 16px',
      borderRadius: '12px',
      textAlign: 'center',
      minWidth: '70px',
    },
    timerNumber: {
      fontSize: 'clamp(20px, 5vw, 28px)',
      fontWeight: 'bold',
      color: '#00ff88',
    },
    timerLabel: {
      fontSize: '10px',
      color: '#666',
      marginTop: '4px',
    },
    footer: {
      textAlign: 'center',
      padding: '24px',
      borderTop: '1px solid #252530',
      color: '#555',
      fontSize: '12px',
    },
    banner: {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#00ff88',
      padding: '12px 24px',
      borderRadius: '100px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      zIndex: 1000,
      boxShadow: '0 4px 20px rgba(0,255,136,0.2)',
    },
    button: {
      background: '#00ff88',
      border: 'none',
      padding: '10px 24px',
      borderRadius: '100px',
      fontWeight: 'bold',
      cursor: 'pointer',
      color: '#0d0d12',
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
      maxWidth: '700px',
      width: '100%',
      maxHeight: '85vh',
      overflow: 'auto',
      border: '1px solid #00ff88',
      position: 'relative',
    },
    waitlistModal: {
      background: '#16161f',
      padding: '32px',
      borderRadius: '20px',
      maxWidth: '450px',
      width: '90%',
      border: '1px solid #00ff88',
    },
    input: {
      width: '100%',
      padding: '12px',
      marginBottom: '12px',
      background: '#0d0d12',
      border: '1px solid #252530',
      borderRadius: '8px',
      color: 'white',
    },
  }

  const [hoveredCard, setHoveredCard] = useState(null)
  const [animatedHovered, setAnimatedHovered] = useState(false)

  return (
    <div style={styles.container}>
      {/* Referral Banner */}
      {referralBanner.show && (
        <div style={styles.banner}>
          <span>🎉</span>
          <span style={{ fontWeight: 'bold', color: '#0d0d12' }}>You've Been Invited! Secure Your Spot Now</span>
          <button onClick={handleDismissBanner} style={{ background: 'transparent', border: 'none', color: '#0d0d12', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ ...styles.content, paddingTop: referralBanner.show ? '80px' : '0' }}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.logo}>THE MATRIX</h1>
          <p style={styles.tagline}>Together We Will All Prosper</p>
          {session && <p style={{ color: '#00ccff', marginTop: '12px' }}>Welcome back!</p>}
        </div>

        {/* Tile Grid */}
        <div style={styles.grid}>
          {/* About Tile */}
          <div
            onMouseEnter={() => setHoveredCard('about')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => setActiveModal('about')}
            style={{ ...styles.card, ...(hoveredCard === 'about' ? styles.cardHover : {}) }}
          >
            <div style={styles.icon}>ℹ️</div>
            <h2 style={styles.cardTitle}>About</h2>
          </div>

          {/* Ethos Tile */}
          <div
            onMouseEnter={() => setHoveredCard('ethos')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => setActiveModal('ethos')}
            style={{ ...styles.card, ...(hoveredCard === 'ethos' ? styles.cardHover : {}) }}
          >
            <div style={styles.icon}>📜</div>
            <h2 style={styles.cardTitle}>Ethos</h2>
          </div>

          {/* Animated Stats Tile */}
          <div
            onMouseEnter={() => setAnimatedHovered(true)}
            onMouseLeave={() => setAnimatedHovered(false)}
            style={{ ...styles.cardNoHover, ...(animatedHovered ? styles.cardNoHoverHover : {}) }}
          >
            <div style={{ ...styles.icon, opacity: fade ? 1 : 0, transition: 'opacity 0.3s' }}>{currentSlide.icon}</div>
            <h2 style={{ ...styles.cardTitle, color: '#00ff88' }}>{currentSlide.title}</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
              {slides.map((_, idx) => (
                <div key={idx} style={{ width: '6px', height: '6px', borderRadius: '50%', background: idx === slideIndex ? '#00ff88' : '#333' }} />
              ))}
            </div>
          </div>

          {/* How It Works Tile */}
          <div
            onMouseEnter={() => setHoveredCard('howItWorks')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => setActiveModal('howItWorks')}
            style={{ ...styles.card, ...(hoveredCard === 'howItWorks' ? styles.cardHover : {}) }}
          >
            <div style={styles.icon}>🧮</div>
            <h2 style={styles.cardTitle}>How It Works</h2>
          </div>

          {/* Help & Login Tile - MODIFIED: Added handleLoginClick */}
          <div
            onMouseEnter={() => setHoveredCard('help')}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ ...styles.card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px', ...(hoveredCard === 'help' ? styles.cardHover : {}) }}
          >
            <div onClick={() => setActiveModal('help')} style={{ cursor: 'pointer' }}>
              <div style={styles.icon}>📚</div>
              <h2 style={styles.cardTitle}>Help & FAQs</h2>
            </div>
            {!isLaunched && (
              <button
                onClick={handleLoginClick}
                style={{ ...styles.button, width: 'fit-content', alignSelf: 'center', marginTop: '12px', background: '#00ccff' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                🔐 Log In
              </button>
            )}
          </div>

          {/* Register / Enter Tile */}
          <div
            onMouseEnter={() => setHoveredCard('main')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={handleMainTileClick}
            style={{ ...styles.countdownCard, ...(hoveredCard === 'main' ? { transform: 'translateY(-4px)', boxShadow: '0 8px 20px rgba(0,0,0,0.3)' } : {}) }}
          >
            <div style={styles.icon}>🚀</div>
            <h2 style={{ ...styles.cardTitle, color: '#00ff88' }}>{session ? 'DASHBOARD' : (isLaunched ? 'ENTER' : 'REGISTER')}</h2>
            {!isLaunched && !session && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
                <div style={styles.timerBox}>
                  <div style={styles.timerNumber}>{formatNumber(countdown.days)}</div>
                  <div style={styles.timerLabel}>Days</div>
                </div>
                <div style={styles.timerBox}>
                  <div style={styles.timerNumber}>{formatNumber(countdown.hours)}</div>
                  <div style={styles.timerLabel}>Hours</div>
                </div>
                <div style={styles.timerBox}>
                  <div style={styles.timerNumber}>{formatNumber(countdown.minutes)}</div>
                  <div style={styles.timerLabel}>Mins</div>
                </div>
                <div style={styles.timerBox}>
                  <div style={styles.timerNumber}>{formatNumber(countdown.seconds)}</div>
                  <div style={styles.timerLabel}>Secs</div>
                </div>
              </div>
            )}
            <p style={{ color: '#666', fontSize: '12px', marginTop: '16px' }}>Launching June 1, 2026</p>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={{ marginBottom: '8px' }}>Together We Will All Prosper</p>
          <p>
            <span onClick={() => setShowTermsModal(true)} style={{ color: '#00ccff', cursor: 'pointer' }}>Terms of Service</span>
            {' • '}
            <span onClick={() => setShowPrivacyModal(true)} style={{ color: '#00ccff', cursor: 'pointer' }}>Privacy Policy</span>
            {' • © 2026 The Matrix (V5.0)'}
          </p>
        </div>
      </div>

      {/* Waitlist Modal - Unchanged */}
      {showWaitlistModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.waitlistModal}>
            {!waitlistResult ? (
              <>
                <h2 style={{ color: '#00ff88', marginBottom: '20px', textAlign: 'center' }}>🚀 Secure Early Access</h2>
                <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '20px' }}>Join the waitlist to secure your spot before launch on June 1, 2026.</p>
                <input type="text" placeholder="Full Name (Private)" value={waitlistName} onChange={(e) => setWaitlistName(e.target.value)} style={styles.input} />
                <input type="text" placeholder="Alias (Public Display Name)" value={waitlistAlias} onChange={(e) => setWaitlistAlias(e.target.value)} style={styles.input} />
                <input type="email" placeholder="Your Email" value={waitlistEmail} onChange={(e) => setWaitlistEmail(e.target.value)} style={styles.input} />
                <input type="password" placeholder="Password" value={waitlistPassword} onChange={(e) => setWaitlistPassword(e.target.value)} style={styles.input} />
                <input type="password" placeholder="Confirm Password" value={waitlistConfirmPassword} onChange={(e) => setWaitlistConfirmPassword(e.target.value)} style={styles.input} />
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleJoinWaitlist} disabled={waitlistLoading} style={{ flex: 1, padding: '12px', background: '#00ff88', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#0d0d12' }}>{waitlistLoading ? 'Joining...' : 'Secure My Spot'}</button>
                  <button onClick={() => setShowWaitlistModal(false)} style={{ flex: 1, padding: '12px', background: '#252530', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Cancel</button>
                </div>
              </>
            ) : waitlistResult.alreadyRegistered ? (
              <>
                <h2 style={{ color: '#00ff88', marginBottom: '20px', textAlign: 'center' }}>✅ You're Already Registered!</h2>
                <div style={{ textAlign: 'center', padding: '20px', background: '#0d0d12', borderRadius: '12px', marginBottom: '20px' }}>
                  <p style={{ color: 'white', fontSize: '18px', marginBottom: '10px' }}>Your Position:</p>
                  <p style={{ color: '#00ff88', fontSize: '64px', fontWeight: 'bold', margin: '0' }}>#{waitlistResult.position}</p>
                </div>
                <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '12px' }}>Share your referral link to move up the list:</p>
                <code style={{ display: 'block', background: '#0d0d12', padding: '10px', borderRadius: '8px', color: '#00ff88', textAlign: 'center', marginBottom: '12px', wordBreak: 'break-all', fontSize: '12px' }}>{window.location.origin}/?ref={waitlistResult.referralCode}</code>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?ref=${waitlistResult.referralCode}`); alert('Referral link copied!') }} style={{ width: '100%', padding: '12px', background: '#00ccff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '12px', color: '#0d0d12' }}>📋 Copy Referral Link</button>
                <button onClick={() => setShowWaitlistModal(false)} style={{ width: '100%', padding: '12px', background: '#252530', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Close</button>
              </>
            ) : (
              <>
                <h2 style={{ color: '#00ff88', marginBottom: '20px', textAlign: 'center' }}>✅ You're In!</h2>
                <div style={{ textAlign: 'center', padding: '20px', background: '#0d0d12', borderRadius: '12px', marginBottom: '20px' }}>
                  <p style={{ color: 'white', fontSize: '18px', marginBottom: '10px' }}>Your Position:</p>
                  <p style={{ color: '#00ff88', fontSize: '64px', fontWeight: 'bold', margin: '0' }}>#{waitlistResult.position}</p>
                </div>
                <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '12px' }}>Share your referral link to move up the list:</p>
                <code style={{ display: 'block', background: '#0d0d12', padding: '10px', borderRadius: '8px', color: '#00ff88', textAlign: 'center', marginBottom: '12px', wordBreak: 'break-all', fontSize: '12px' }}>{window.location.origin}/?ref={waitlistResult.referralCode}</code>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?ref=${waitlistResult.referralCode}`); alert('Referral link copied!') }} style={{ width: '100%', padding: '12px', background: '#00ccff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '12px', color: '#0d0d12' }}>📋 Copy Referral Link</button>
                <button onClick={() => setShowWaitlistModal(false)} style={{ width: '100%', padding: '12px', background: '#252530', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Close</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Info Modal */}
      {activeModal && (
        <div style={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setActiveModal(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            {renderModalContent()}
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowTermsModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowTermsModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}>✕</button>
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
            
            <p style={{ color: '#00ff88', fontSize: '14px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #252530' }}>BY USING THE MATRIX, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO THESE TERMS.</p>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPrivacyModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowPrivacyModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}>✕</button>
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

export default LandingPage