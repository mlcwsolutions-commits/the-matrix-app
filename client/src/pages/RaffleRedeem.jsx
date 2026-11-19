// client/src/pages/RaffleRedeem.jsx
// THE MATRIX V5.2 - Public raffle ticket redemption page
// Route: /raffle/redeem?code=RAFFLE-XXXX-XXXX
// UPDATED: handleReset now fully clears the form and URL context for redeeming multiple tickets.

import { useState, useEffect } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const TICKET_CODE_REGEX = /^RAFFLE-[A-Z0-9]{4}-[A-Z0-9]{4}$/

export default function RaffleRedeem() {
  const [isMobile, setIsMobile] = useState(false)

  // URL code (may be empty if user navigates directly)
  const [ticketCode, setTicketCode] = useState('')
  const [codeFromUrl, setCodeFromUrl] = useState('')

  // Form fields
  const [email, setEmail] = useState('')
  const [realName, setRealName] = useState('')
  const [alias, setAlias] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rawCode = (params.get('code') || '').toUpperCase().trim()
    setCodeFromUrl(rawCode)
    setTicketCode(rawCode)

    if (rawCode && !TICKET_CODE_REGEX.test(rawCode)) {
      setError('Invalid ticket link. Please check the code or contact your agent.')
    }
  }, [])

  const codeIsValid = TICKET_CODE_REGEX.test(ticketCode.toUpperCase().trim())

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const normalizedCode = ticketCode.trim().toUpperCase()
    if (!codeIsValid) {
      setError('Invalid ticket code format. Expected format: RAFFLE-XXXX-XXXX')
      return
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-raffle-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketCode: normalizedCode,
          buyerEmail: email.trim(),
          buyerName: realName.trim() || undefined,
          buyerAlias: alias.trim() || undefined
        })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        if (data.success && data.already_redeemed) {
          setSuccess({
            displayAlias: data.displayAlias,
            alreadyRedeemed: true,
            redeemedAt: data.redeemedAt
          })
          return
        }
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }

      setSuccess({
        displayAlias: data.displayAlias,
        raffleTitle: data.raffleTitle,
        prizeDescription: data.prizeDescription,
        redeemedAt: data.redeemedAt,
        alreadyRedeemed: !!data.already_redeemed,
        aliasWasGenerated: !alias.trim()
      })
    } catch (err) {
      console.error('Redemption error:', err)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // Updated handleReset to always provide a fresh form
  const handleReset = () => {
    setSuccess(null)
    setError(null)
    setEmail('')
    setRealName('')
    setAlias('')
    
    // Clear ticket code and URL context so buyer can enter a new one
    setTicketCode('')
    setCodeFromUrl('')
    
    // Clean the URL so it doesn't retain the ?code= query parameter
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }

  // ============================================================
  // STYLES
  // ============================================================
  const pageStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isMobile ? 16 : 32,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif'
  }

  const cardStyle = {
    background: '#1a1a3a',
    border: '1px solid #9b59b6',
    borderRadius: 16,
    padding: isMobile ? 24 : 40,
    width: '100%',
    maxWidth: 500,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  }

  const inputStyle = {
    width: '100%',
    padding: 12,
    background: '#0a0a2a',
    color: 'white',
    border: '1px solid #9b59b6',
    borderRadius: 8,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box'
  }

  const labelStyle = {
    display: 'block',
    color: '#aaa',
    fontSize: 13,
    marginBottom: 6,
    fontWeight: 500
  }

  const helperStyle = {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 1.4
  }

  // ============================================================
  // RENDER — SUCCESS STATE
  // ============================================================
  if (success) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <h1 style={{ color: '#00ff88', fontSize: isMobile ? 22 : 26, margin: '0 0 8px 0' }}>
              {success.alreadyRedeemed ? 'You\'re already in!' : 'You\'re in the draw!'}
            </h1>
            <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>
              {success.alreadyRedeemed
                ? 'This ticket was already registered. You\'re all set.'
                : 'Your raffle entry has been confirmed.'}
            </p>
          </div>

          <div
            style={{
              background: '#0a0a2a',
              border: '1px solid #00ff88',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              textAlign: 'center'
            }}
          >
            <div style={{ color: '#aaa', fontSize: 12, marginBottom: 6 }}>You are registered as</div>
            <div
              style={{
                color: '#00ff88',
                fontSize: isMobile ? 22 : 26,
                fontWeight: 'bold',
                fontFamily: 'monospace',
                letterSpacing: 1
              }}
            >
              {success.displayAlias}
            </div>
            {success.aliasWasGenerated && (
              <div style={{ color: '#666', fontSize: 11, marginTop: 8 }}>
                (Auto-generated — you didn't choose one)
              </div>
            )}
          </div>

          {success.raffleTitle && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#aaa', fontSize: 12, marginBottom: 4 }}>Raffle</div>
              <div style={{ color: 'white', fontSize: 15, fontWeight: 500 }}>{success.raffleTitle}</div>
            </div>
          )}

          {success.prizeDescription && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#aaa', fontSize: 12, marginBottom: 4 }}>Prize</div>
              <div style={{ color: '#00ccff', fontSize: 15 }}>{success.prizeDescription}</div>
            </div>
          )}

          <div
            style={{
              padding: 12,
              background: 'rgba(0, 255, 136, 0.08)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              borderRadius: 8,
              marginBottom: 20
            }}
          >
            <p style={{ color: '#aaa', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
              💡 <strong>Save this page.</strong> If you win, we'll contact you via the email you provided.
            </p>
          </div>

          <button
            onClick={handleReset}
            style={{
              width: '100%',
              padding: 14,
              background: '#9b59b6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: 12
            }}
          >
            🎟️ Redeem Another Ticket
          </button>
          
          <button
            onClick={() => { window.location.href = '/' }}
            style={{
              width: '100%',
              padding: 14,
              background: 'transparent',
              color: '#aaa',
              border: '1px solid #333',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // RENDER — FORM STATE
  // ============================================================
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎟️</div>
          <h1 style={{ color: 'white', fontSize: isMobile ? 22 : 26, margin: '0 0 8px 0' }}>
            Claim Your Raffle Entry
          </h1>
          <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>
            Enter your details below to confirm your ticket.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div
            style={{
              padding: 14,
              background: 'rgba(255, 68, 68, 0.1)',
              border: '1px solid #ff4444',
              borderRadius: 8,
              marginBottom: 20
            }}
          >
            <p style={{ color: '#ff4444', fontSize: 13, margin: 0 }}>❌ {error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Ticket code */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Ticket Code {codeFromUrl && <span style={{ color: '#00ff88' }}>✓</span>}
            </label>
            <input
              type="text"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
              placeholder="RAFFLE-XXXX-XXXX"
              readOnly={!!codeFromUrl && codeIsValid}
              style={{
                ...inputStyle,
                fontFamily: 'monospace',
                letterSpacing: 1,
                color: codeIsValid ? '#00ff88' : 'white',
                background: codeFromUrl && codeIsValid ? '#0d1a1a' : '#0a0a2a'
              }}
            />
            {!codeFromUrl && (
              <div style={helperStyle}>
                You should have received this from your agent. Format: RAFFLE-XXXX-XXXX
              </div>
            )}
          </div>

          {/* Email */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Your Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
            />
            <div style={helperStyle}>
              Required. Used by the agent to contact you if you win.
            </div>
          </div>

          {/* Real name */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Your Real Name (optional)</label>
            <input
              type="text"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              placeholder="For prize delivery"
              maxLength={200}
              style={inputStyle}
            />
            <div style={helperStyle}>
              Kept private. Only the agent and admin see this.
            </div>
          </div>

          {/* Alias */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Public Display Name (optional)</label>
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="e.g. LuckyTiger99"
              maxLength={40}
              style={inputStyle}
            />
            <div style={helperStyle}>
              If you win, this name appears in public announcements. Leave blank to be announced
              as <strong style={{ color: '#9b59b6' }}>Guest-XXXX</strong>.
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !codeIsValid}
            style={{
              width: '100%',
              padding: 14,
              background: loading || !codeIsValid ? '#555' : 'linear-gradient(135deg, #9b59b6, #7d3f9b)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading || !codeIsValid ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? '⏳ Confirming...' : '🎯 Confirm My Entry'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <p style={{ color: '#666', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
            By confirming, you agree to enter this raffle. Your ticket will be marked as redeemed
            and cannot be reused.
          </p>
        </div>
      </div>
    </div>
  )
}