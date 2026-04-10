import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [randomAssign, setRandomAssign] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('form')

  const EDGE_FUNCTION_URL = 'https://iqctlwnlesnimzzatwry.supabase.co/functions/v1/create-user'

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (!termsAccepted) {
      setError('You must accept the Terms and Conditions')
      setLoading(false)
      return
    }

    if (!referralCode && !randomAssign) {
      setError('Please enter a referral code or check random assignment')
      setLoading(false)
      return
    }

    setStep('processing')

    try {
      // Step 1: Create auth user in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      })

      if (authError) throw authError

      if (!authData.user) throw new Error('User creation failed')

      // Get the session to obtain a valid token
      const { data: { session: currentSession } } = await supabase.auth.getSession()

      // Step 2: Call Edge Function to create user in database and place in matrix
      const response = await fetch(EDGE_FUNCTION_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: authData.user.id,
    name: name,
    email: email,
    referralCode: randomAssign ? '' : referralCode,
    randomAssign: randomAssign
  })
})

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message)
      }

      // Success - redirect to login
      window.location.href = '/login?message=Account+created+successfully!+Please+login.'
    } catch (err) {
      setError(err.message)
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'rgba(0,0,0,0.5)', padding: '30px', borderRadius: '10px', width: '450px' }}>
        <h1 style={{ color: '#00ff88', textAlign: 'center', marginBottom: '20px' }}>🔷 Join The Matrix</h1>
        
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #00ff88', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ color: 'white', marginTop: '15px' }}>Creating your account and placing you in the matrix...</p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Referred By (Referral Code)</label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="Optional"
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '15px', background: 'rgba(255,165,0,0.15)', padding: '12px', borderRadius: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#ffa502' }}>
                <input
                  type="checkbox"
                  checked={randomAssign}
                  onChange={(e) => setRandomAssign(e.target.checked)}
                  style={{ marginRight: '10px', width: '18px', height: '18px' }}
                />
                <span>⚠️ Don't have a referral code? Random assignment (irreversible)</span>
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{ marginRight: '10px', width: '18px', height: '18px' }}
                  required
                />
                <span style={{ color: 'white' }}>I agree to the Terms and Conditions</span>
              </label>
            </div>

            {error && (
              <div style={{ background: '#ff4444', color: 'white', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00ccff, #00ff88)', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Creating Account...' : 'Sign Up & Pay (50,000 pts)'}
            </button>
          </form>
        )}

        {step === 'form' && (
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <Link to="/login" style={{ color: '#00ccff' }}>Already have an account? Login</Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default Signup