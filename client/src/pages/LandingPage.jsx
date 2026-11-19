// client/src/pages/LandingPage.jsx
// THE MATRIX V5.0 — Pre-Launch Countdown Page
// Waitlist disabled. Entry only available after LAUNCH_DATE.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const SIGMA_ICONS = {
  comingSoon: '/assets/sigma-icon-coming-soon.png',
  liveStats: '/assets/sigma-icon-live-stats.png',
  raffles: '/assets/sigma-icon-raffles.png',
  bonuses: '/assets/sigma-icon-bonuses.png',
  shopPoints: '/assets/sigma-icon-shop-points.png',
  crediPoints: '/assets/sigma-icon-credipoints.png',
}

const FALLBACK_ICONS = {
  comingSoon: '🚀',
  liveStats: '📊',
  raffles: '🎲',
  bonuses: '🏆',
  shopPoints: '🛍️',
  crediPoints: '💳',
}

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
  const [hoveredCard, setHoveredCard] = useState(null)
  const [animatedHovered, setAnimatedHovered] = useState(false)
  const [iconsLoaded, setIconsLoaded] = useState(false)

  // ⚠️ SET YOUR LAUNCH DATE HERE
  const LAUNCH_DATE = new Date('2026-11-25T00:00:00')

  const slides = [
    { iconKey: 'comingSoon', title: 'Coming Soon!' },
    { iconKey: 'liveStats', title: 'Live Stats' },
    { iconKey: 'raffles', title: 'Raffles' },
    { iconKey: 'bonuses', title: 'Bonuses' },
    { iconKey: 'shopPoints', title: 'Shop with Points' },
    { iconKey: 'crediPoints', title: 'CrediPoints' }
  ]

  useEffect(() => {
    const preloadImages = async () => {
      const promises = Object.values(SIGMA_ICONS).map(src => {
        return new Promise((resolve) => {
          const img = new Image()
          img.onload = () => resolve(true)
          img.onerror = () => resolve(false)
          img.src = src
        })
      })
      const results = await Promise.all(promises)
      setIconsLoaded(results.some(r => r))
    }
    preloadImages()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setSlideIndex((prev) => (prev + 1) % slides.length)
        setFade(true)
      }, 300)
    }, 3000)
    return () => clearInterval(interval)
  }, [slides.length])

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

  // ⚠️ WAITLIST DISABLED — this function only routes for post-launch or existing sessions
  const handleMainTileClick = () => {
    // Before launch: no action at all (button is visually inactive)
    if (!isLaunched && !session) {
      return
    }

    const pendingRef = localStorage.getItem('pendingReferral')

    if (session) {
      navigate('/dashboard')
      return
    }

    if (isLaunched) {
      if (pendingRef) {
        navigate(`/signup?ref=${pendingRef}`)
        localStorage.removeItem('pendingReferral')
      } else {
        navigate('/login')
      }
    }
  }

  const handleLoginClick = () => {
    if (session) {
      navigate(isLaunched ? '/dashboard' : '/dashboard')
    } else if (isLaunched) {
      navigate('/login')
    }
  }

  const handleSignupClick = () => {
    if (session) {
      navigate('/dashboard')
    } else if (isLaunched) {
      navigate('/signup')
    }
  }

  const handleDismissBanner = () => {
    setReferralBanner({ show: false, code: '' })
  }

  const formatNumber = (num) => String(num).padStart(2, '0')

  // ============================================
  // MODAL CONTENT — About / Ethos / How It Works / Help
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
            <p style={{ color: '#ccc', marginBottom: '10px', lineHeight: '1.6', fontSize: '14px' }}><strong>Launch Date:</strong> November 25, 2026</p>
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
            <p style={{ color: '#ccc', marginBottom: '20px', lineHeight: '1.6', fontSize: '14px' }}>Earnings are distributed through structured community rewards.</p>
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
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>Absolutely not. The Matrix is a community wealth-building platform, akin to how a co-operative functions. We've engineered out the predatory mechanics and replaced them with transparency, fairness, and shared ownership. Matrix positions are digital assets with utility (point earnings, shop access, asset ownership); and you NEVER have to recruit/refer anyone if you don't want to.</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>2. What is a "sub-root"?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>Every spot (absolute position) you own is the root of its own 85-spot sub-matrix. This sub-matrix is used for commission calculations on entries placed under you.</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>3. How do I earn commissions?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>You earn from point purchases made within your 3-level downline (your direct referrals, their referrals, and their referrals). The exact breakdown is displayed in every transaction in your dashboard.</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>4. What is the Recovery Fund?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>A community-owned capital pool funded by each and every purchase. It will eventually be used to acquire assets (digital, real estate, businesses) that benefit all members.</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>5. What are "CrediPoints"?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>A future digital benefit; details will be announced as the feature develops.</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>6. Can I move up the waitlist?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>Yes, your position can be improved by referring new members. Each time someone joins using your waitlist link, you are rewarded by advancing one spot ahead.</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>7. What happens after July 15, 2026?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>The live Matrix system launches. Waitlist positions are converted into matrix spots, and you can then buy points, earn commissions, and use the platform.</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>8. Can I lose points?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>Points have no guaranteed cash value. You may lose the value of points you purchase, and commissions are not guaranteed. The system is a digital asset, not an investment.</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>9. What is the "Auto-Entry" feature?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>A mechanism that gives non-recruiters a chance to receive commissions through the Recovery Fund, ensuring that everyone has an opportunity to participate.</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#00ff88', marginBottom: '8px', fontSize: '16px', fontWeight: 'bold' }}>10. How do I get an activation code?</p>
              <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5' }}>Activation codes function similar to gift cards. They're worth 5,000 points and are only available through authorised agents. Contact support via email or engage an agent to purchase one. Agents are accessible via the WhatsApp link below.</p>
            </div>

            <div style={{ background: '#0a0a2a', padding: '20px', borderRadius: '10px', marginTop: '20px', textAlign: 'center' }}>
              <p style={{ color: '#00ff88', marginBottom: '15px', fontSize: '16px' }}>📧 Need more help?</p>
              <p style={{ color: '#aaa', marginBottom: '15px' }}>Email us: <a href="mailto:hello@the-matrix.app" style={{ color: '#00ccff' }}>hello@the-matrix.app</a></p>
              <a href="https://chat.whatsapp.com/IMRG4tKz9K6G2DntpdnVvu" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#25D366', color: 'white', padding: '10px 20px', borderRadius: '50px', textDecoration: 'none', fontWeight: 'bold', marginTop: '5px' }}>
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

  const styles = {
    container: { minHeight: '100vh', background: '#0a0a0f', color: '#e0e0e0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', overflowX: 'hidden', position: 'relative' },
    ambientGlow: { position: 'fixed', top: '5%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(0,255,136,0.03) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 },
    content: { maxWidth: '480px', margin: '0 auto', padding: '0 20px', position: 'relative', zIndex: 1 },
    hero: { textAlign: 'center', paddingTop: referralBanner.show ? '100px' : '60px', paddingBottom: '32px' },
    logo: { color: '#00ff88', fontSize: 'clamp(36px, 10vw, 48px)', fontWeight: '800', letterSpacing: '0.12em', marginBottom: '12px', textTransform: 'uppercase', textShadow: '0 0 40px rgba(0,255,136,0.25), 0 0 80px rgba(0,255,136,0.08)' },
    tagline: { color: '#777', fontSize: 'clamp(13px, 3.5vw, 15px)', letterSpacing: '0.08em', fontWeight: '400', marginBottom: '10px' },
    versionBadge: { display: 'inline-block', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.15)', color: '#00ff88', padding: '3px 12px', borderRadius: '100px', fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em' },
    welcomeBack: { color: '#00ccff', marginTop: '14px', fontSize: '13px', fontWeight: '500' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '36px' },
    card: { background: 'linear-gradient(145deg, #12121a, #0e0e15)', padding: '20px 14px', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden', minHeight: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    cardActive: { borderColor: 'rgba(0,255,136,0.25)', boxShadow: '0 4px 20px rgba(0,255,136,0.06), inset 0 1px 0 rgba(255,255,255,0.04)', transform: 'translateY(-2px)' },
    sigmaIcon: { width: '100%', height: 'auto', maxHeight: '70px', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,255,136,0.15))', marginBottom: '0' },
    sigmaIconLarge: { width: '52px', height: '52px', marginBottom: '10px', objectFit: 'contain', filter: 'drop-shadow(0 2px 12px rgba(0,255,136,0.2))' },
    cardTitle: { color: '#ddd', fontSize: '12px', fontWeight: '600', letterSpacing: '0.02em' },
    featuredCard: { background: 'linear-gradient(145deg, #0d1f15, #0a1a12)', padding: '28px 20px', borderRadius: '20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid rgba(0,255,136,0.12)', position: 'relative', overflow: 'hidden', gridColumn: '1 / -1', boxShadow: '0 8px 32px rgba(0,255,136,0.05)', minHeight: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    featuredCardActive: { borderColor: 'rgba(0,255,136,0.35)', boxShadow: '0 12px 40px rgba(0,255,136,0.1), 0 0 60px rgba(0,255,136,0.03)', transform: 'translateY(-3px)' },
    featuredTitle: { color: '#00ff88', fontSize: '20px', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '14px' },
    timerContainer: { display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '14px', marginBottom: '10px' },
    timerBox: { background: 'rgba(0,0,0,0.35)', padding: '10px 6px', borderRadius: '10px', textAlign: 'center', minWidth: '54px', border: '1px solid rgba(0,255,136,0.08)' },
    timerNumber: { fontSize: '20px', fontWeight: '800', color: '#00ff88', fontFamily: '"SF Mono", Monaco, monospace', letterSpacing: '-0.02em', lineHeight: 1 },
    timerLabel: { fontSize: '8px', color: '#555', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.12em' },
    timerSeparator: { color: '#00ff88', fontSize: '18px', fontWeight: 'bold', alignSelf: 'center', opacity: 0.4, paddingTop: '4px' },
    launchDate: { color: '#555', fontSize: '11px', marginTop: '6px', letterSpacing: '0.05em' },
    statsCard: { background: 'linear-gradient(145deg, #12121a, #0e0e15)', padding: '16px 10px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden', minHeight: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    statsIcon: { width: '48px', height: '48px', marginBottom: '6px', objectFit: 'contain', transition: 'opacity 0.3s ease', filter: 'drop-shadow(0 2px 8px rgba(0,255,136,0.15))' },
    statsTitle: { color: '#00ff88', fontSize: '15px', fontWeight: '600', transition: 'opacity 0.3s ease' },
    helpCard: { background: 'linear-gradient(145deg, #12121a, #0e0e15)', padding: '18px 14px', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden', minHeight: '130px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' },
    loginBtn: { background: 'linear-gradient(135deg, #00ccff, #0099cc)', border: 'none', padding: '7px 18px', borderRadius: '100px', fontWeight: '600', cursor: 'pointer', color: '#0a0a0f', fontSize: '11px', letterSpacing: '0.05em', marginTop: '8px', transition: 'all 0.2s ease', boxShadow: '0 4px 15px rgba(0,204,255,0.15)' },
    footer: { textAlign: 'center', padding: '28px 20px 36px', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: '16px' },
    footerTagline: { color: '#444', fontSize: '12px', fontWeight: '500', letterSpacing: '0.05em', marginBottom: '14px' },
    footerLinks: { color: '#333', fontSize: '10px', lineHeight: '1.8' },
    footerLink: { color: '#00ccff', cursor: 'pointer', textDecoration: 'none' },
    banner: { position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #00ff88, #00cc66)', padding: '10px 18px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 1000, boxShadow: '0 8px 30px rgba(0,255,136,0.25)', maxWidth: '92vw', fontSize: '12px', fontWeight: '600', color: '#0a0a0f' },
    bannerDismiss: { background: 'rgba(0,0,0,0.12)', border: 'none', width: '22px', height: '22px', borderRadius: '50%', color: '#0a0a0f', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(6px)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' },
    modalContent: { background: 'linear-gradient(180deg, #16161f, #0f0f17)', padding: '28px 24px', borderRadius: '24px 24px 0 0', maxWidth: '100%', width: '100%', maxHeight: '85vh', overflow: 'auto', border: '1px solid rgba(0,255,136,0.08)', borderBottom: 'none', position: 'relative', animation: 'slideUp 0.3s ease-out' },
    modalClose: { position: 'absolute', top: '14px', right: '14px', background: 'rgba(255,255,255,0.05)', border: 'none', width: '34px', height: '34px', borderRadius: '50%', color: '#777', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  }

  const renderIcon = (iconKey, size = 'normal') => {
    const src = SIGMA_ICONS[iconKey]
    const fallback = FALLBACK_ICONS[iconKey]
    const style = size === 'large' ? styles.sigmaIconLarge : styles.sigmaIcon
    if (iconsLoaded && src) {
      return <img src={src} alt={iconKey} style={style} />
    }
    return (
      <div style={{ fontSize: size === 'large' ? '36px' : '26px', marginBottom: '8px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
        {fallback}
      </div>
    )
  }

  const getCardStyle = (cardId, isFeatured = false, isStats = false, isHelp = false) => {
    const isHovered = hoveredCard === cardId
    if (isFeatured) return { ...styles.featuredCard, ...(isHovered ? styles.featuredCardActive : {}) }
    if (isStats) return styles.statsCard
    if (isHelp) return { ...styles.helpCard, ...(isHovered ? styles.cardActive : {}) }
    return { ...styles.card, ...(isHovered ? styles.cardActive : {}) }
  }

  return (
    <div style={styles.container}>
      <div style={styles.ambientGlow} />

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Referral banner — only shown AFTER launch */}
      {referralBanner.show && isLaunched && (
        <div style={styles.banner}>
          <span style={{ fontSize: '15px' }}>🎉</span>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Invited! Secure Your Spot
          </span>
          <button onClick={handleDismissBanner} style={styles.bannerDismiss}>✕</button>
        </div>
      )}

      <div style={styles.content}>
        <div style={styles.hero}>
          <h1 style={styles.logo}>SIGMA-PLUS</h1>
          <p style={styles.tagline}>Together We Will All Prosper</p>
          <span style={styles.versionBadge}>V5.0</span>
          {session && <p style={styles.welcomeBack}>Welcome back!</p>}
        </div>

        <div style={styles.grid}>
          {/* About */}
          <div
            onMouseEnter={() => setHoveredCard('about')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => setActiveModal('about')}
            style={getCardStyle('about')}
          >
            <div style={{ fontSize: '26px', marginBottom: '8px' }}>ℹ️</div>
            <h2 style={styles.cardTitle}>About</h2>
          </div>

          {/* Ethos */}
          <div
            onMouseEnter={() => setHoveredCard('ethos')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => setActiveModal('ethos')}
            style={getCardStyle('ethos')}
          >
            <div style={{ fontSize: '26px', marginBottom: '8px' }}>📜</div>
            <h2 style={styles.cardTitle}>Ethos</h2>
          </div>

          {/* Stats Carousel */}
          <div
            onMouseEnter={() => { setHoveredCard('stats'); setAnimatedHovered(true) }}
            onMouseLeave={() => { setHoveredCard(null); setAnimatedHovered(false) }}
            style={getCardStyle('stats', false, false, true)}
          >
            <div style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.3s ease' }}>
              {renderIcon(currentSlide.iconKey, 'normal')}
            </div>
            {!iconsLoaded && (
              <h2 style={{ ...styles.statsTitle, opacity: fade ? 1 : 0 }}>{currentSlide.title}</h2>
            )}
          </div>

          {/* How It Works */}
          <div
            onMouseEnter={() => setHoveredCard('howItWorks')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => setActiveModal('howItWorks')}
            style={getCardStyle('howItWorks')}
          >
            <div style={{ fontSize: '26px', marginBottom: '8px' }}>🧮</div>
            <h2 style={styles.cardTitle}>How It Works</h2>
          </div>

          {/* Help & FAQs */}
          <div
            onMouseEnter={() => setHoveredCard('help')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={() => setActiveModal('help')}
            style={getCardStyle('help', false, false, true)}
          >
            <div style={{ fontSize: '26px', marginBottom: '8px' }}>📚</div>
            <h2 style={styles.cardTitle}>Help & FAQs</h2>
          </div>

          {/* More */}
          <div
            onMouseEnter={() => setHoveredCard('more')}
            onMouseLeave={() => setHoveredCard(null)}
            style={getCardStyle('more', false, false, true)}
          >
            <div style={{ fontSize: '42px', marginBottom: '8px', fontWeight: 'bold', lineHeight: 1, textShadow: '0 0 12px rgba(0,255,136,0.4)' }}>➕</div>
            <h2 style={styles.cardTitle}>More</h2>
          </div>

          {/* Featured Card — countdown / coming soon / enter */}
          <div
            onMouseEnter={() => setHoveredCard('main')}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={isLaunched || session ? handleMainTileClick : undefined}
            style={{
              ...getCardStyle('main', true),
              ...(!isLaunched && !session ? { cursor: 'default' } : {})
            }}
          >
            <h2 style={styles.featuredTitle}>
              {session ? 'DASHBOARD' : (isLaunched ? 'ENTER' : 'COMING SOON')}
            </h2>

            {!isLaunched && !session && (
              <>
                <div style={styles.timerContainer}>
                  <div style={styles.timerBox}>
                    <div style={styles.timerNumber}>{formatNumber(countdown.days)}</div>
                    <div style={styles.timerLabel}>Days</div>
                  </div>
                  <span style={styles.timerSeparator}>:</span>
                  <div style={styles.timerBox}>
                    <div style={styles.timerNumber}>{formatNumber(countdown.hours)}</div>
                    <div style={styles.timerLabel}>Hours</div>
                  </div>
                  <span style={styles.timerSeparator}>:</span>
                  <div style={styles.timerBox}>
                    <div style={styles.timerNumber}>{formatNumber(countdown.minutes)}</div>
                    <div style={styles.timerLabel}>Mins</div>
                  </div>
                  <span style={styles.timerSeparator}>:</span>
                  <div style={styles.timerBox}>
                    <div style={styles.timerNumber}>{formatNumber(countdown.seconds)}</div>
                    <div style={styles.timerLabel}>Secs</div>
                  </div>
                </div>
                <p style={styles.launchDate}>Launching July 15, 2026</p>
                <p style={{ color: '#555', fontSize: '11px', marginTop: '8px', opacity: 0.7 }}>
                  🔒 Private launch in progress
                </p>
              </>
            )}

            {isLaunched && !session && (
              <p style={{ color: '#00ff88', fontSize: '12px', marginTop: '6px', opacity: 0.6 }}>
                Tap to enter the platform
              </p>
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerTagline}>Together We Will All Prosper</p>
          <p style={styles.footerLinks}>
            <span onClick={() => setShowTermsModal(true)} style={styles.footerLink}>Terms of Service</span>
            {' • '}
            <span onClick={() => setShowPrivacyModal(true)} style={styles.footerLink}>Privacy Policy</span>
            {' • © 2026 The Matrix'}
          </p>
        </div>
      </div>

      {/* ⚠️ WAITLIST MODAL DISABLED — {false && ...} ensures it can never render */}
      {false && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}></div>
        </div>
      )}

      {/* Info Modal (About / Ethos / How It Works / Help) */}
      {activeModal && (
        <div style={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setActiveModal(null)} style={styles.modalClose}>✕</button>
            {renderModalContent()}
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTermsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowTermsModal(false)}>
          <div style={{ ...styles.modalContent, maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowTermsModal(false)} style={styles.modalClose}>✕</button>
            <h1 style={{ color: '#00ff88', fontSize: '22px', marginBottom: '6px', fontWeight: '700' }}>Terms of Service</h1>
            <p style={{ color: '#555', fontSize: '10px', marginBottom: '18px' }}>Effective Date: May 1, 2026</p>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginTop: '16px', marginBottom: '6px', fontWeight: '600' }}>Introduction</h2>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px' }}>Welcome to The Matrix ("Platform", "we", "us", "our"). These Terms of Service ("Terms") govern your use of our platform, website, and related services. By accessing or using The Matrix, you agree to be bound by these Terms.</p>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>Definitions</h2>
            <ul style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.7', marginBottom: '10px', paddingLeft: '16px' }}>
              <li><strong style={{ color: '#00ff88' }}>Points:</strong> The internal virtual currency of The Matrix, used for purchasing matrix positions</li>
              <li><strong style={{ color: '#00ff88' }}>Matrix Position:</strong> A digital asset representing a spot in the 4-wide matrix structure</li>
              <li><strong style={{ color: '#00ff88' }}>Commission:</strong> Points earned from point purchases within your downline</li>
              <li><strong style={{ color: '#00ff88' }}>Recovery Fund:</strong> A community-owned pool funded by a portion of every point purchase</li>
              <li><strong style={{ color: '#00ff88' }}>User:</strong> Any individual who registers an account on The Matrix</li>
            </ul>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>No Investment or Security</h2>
            <p style={{ color: '#ff6b6b', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px', fontWeight: 'bold' }}>IMPORTANT: The Matrix is NOT an investment vehicle, security, or financial instrument.</p>
            <ul style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.7', marginBottom: '10px', paddingLeft: '16px' }}>
              <li>Points have no guaranteed value</li>
              <li>Commissions are not guaranteed returns</li>
              <li>No promise of profit is made</li>
              <li>You are purchasing a digital asset, not an investment</li>
            </ul>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>How The Matrix Works</h2>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px' }}>The Matrix is a community wealth-building platform where users acquire points to participate in a structured system that may generate commissions and contribute to a community fund.</p>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>No Pyramid Scheme</h2>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px' }}>The Matrix is NOT a pyramid scheme because:</p>
            <ul style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.7', marginBottom: '10px', paddingLeft: '16px' }}>
              <li>No payment is required to participate</li>
              <li>Commissions are based on point purchases, not recruitment</li>
              <li>The matrix structure has built-in limits</li>
              <li>Auto-entry provides opportunities for all participants</li>
            </ul>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>Risk Disclosure</h2>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px' }}>By using The Matrix, you acknowledge and accept:</p>
            <ul style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.7', marginBottom: '10px', paddingLeft: '16px' }}>
              <li>Points have no guaranteed cash value</li>
              <li>Commissions are not guaranteed</li>
              <li>The platform may evolve or change over time</li>
              <li>Technical issues, delays, or interruptions may occur</li>
              <li>You may lose the value of points you purchase</li>
              <li>Past performance does not indicate future results</li>
            </ul>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>Eligibility</h2>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px' }}>You must be at least 18 years old to use The Matrix. You are responsible for determining whether your participation complies with applicable laws in your jurisdiction.</p>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>Prohibited Activities</h2>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px' }}>You may not:</p>
            <ul style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.7', marginBottom: '10px', paddingLeft: '16px' }}>
              <li>Use the platform for any illegal purpose</li>
              <li>Manipulate or exploit the matrix structure</li>
              <li>Create multiple accounts</li>
              <li>Engage in fraudulent or deceptive practices</li>
              <li>Promote The Matrix as an "investment opportunity"</li>
            </ul>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>Termination</h2>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px' }}>We reserve the right to suspend or terminate accounts that violate these Terms.</p>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>Limitation of Liability</h2>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px' }}>To the maximum extent permitted by law, The Matrix shall not be liable for any indirect, incidental, or consequential damages.</p>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>Changes to Terms</h2>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px' }}>We may update these Terms from time to time. Continued use of the platform constitutes acceptance of updated Terms.</p>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>Contact</h2>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px' }}>For questions about these Terms, contact: hello@the-matrix.app</p>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>Governing Principles</h2>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px' }}>These Terms shall be interpreted in accordance with the principles of equity, good conscience, and international comity, drawing inspiration from the universal values of fairness, transparency, and human dignity. The parties agree to resolve disputes through dialogue and good faith negotiation before seeking any formal remedy.</p>

            <p style={{ color: '#00ff88', fontSize: '12px', marginTop: '18px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>BY USING THE MATRIX, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO THESE TERMS.</p>
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {showPrivacyModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPrivacyModal(false)}>
          <div style={{ ...styles.modalContent, maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowPrivacyModal(false)} style={styles.modalClose}>✕</button>
            <h1 style={{ color: '#00ff88', fontSize: '22px', marginBottom: '6px', fontWeight: '700' }}>Privacy Policy</h1>
            <p style={{ color: '#555', fontSize: '10px', marginBottom: '18px' }}>Effective Date: May 1, 2026</p>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>Information We Collect</h2>
            <ul style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.7', marginBottom: '10px', paddingLeft: '16px' }}>
              <li><strong style={{ color: '#00ff88' }}>Account Information:</strong> Email, name, alias</li>
              <li><strong style={{ color: '#00ff88' }}>Transaction Data:</strong> Point purchases, commissions, redemptions</li>
              <li><strong style={{ color: '#00ff88' }}>Usage Data:</strong> Login times, feature usage</li>
              <li><strong style={{ color: '#00ff88' }}>Device Information:</strong> IP address, browser type</li>
            </ul>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>How We Use Your Information</h2>
            <ul style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.7', marginBottom: '10px', paddingLeft: '16px' }}>
              <li>To operate and improve the platform</li>
              <li>To process transactions</li>
              <li>To communicate important updates</li>
              <li>To comply with legal obligations</li>
            </ul>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>Data Sharing</h2>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px' }}>We do not sell your personal information. We may share data:</p>
            <ul style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.7', marginBottom: '10px', paddingLeft: '16px' }}>
              <li>With service providers (Supabase, Vercel, NowPayments)</li>
              <li>When required by law</li>
              <li>To protect our rights and safety</li>
            </ul>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>Your Rights</h2>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px' }}>You may request:</p>
            <ul style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.7', marginBottom: '10px', paddingLeft: '16px' }}>
              <li>Access to your data</li>
              <li>Correction of inaccurate data</li>
              <li>Deletion of your account</li>
            </ul>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>Data Retention</h2>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px' }}>We retain your data as long as your account is active or as needed to provide services.</p>

            <h2 style={{ color: '#00ccff', fontSize: '15px', marginBottom: '6px', fontWeight: '600' }}>Contact</h2>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.6', marginBottom: '10px' }}>Privacy questions: hello@the-matrix.app</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default LandingPage