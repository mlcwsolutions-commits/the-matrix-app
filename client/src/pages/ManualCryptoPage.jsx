// client/src/pages/ManualCryptoPage.jsx
// THE MATRIX V5.0 - Shared Manual Crypto Payment Page

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

function ManualCryptoPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [wallets, setWallets] = useState([])
  const [selectedWallet, setSelectedWallet] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const [transactionHash, setTransactionHash] = useState('')
  const [senderAddress, setSenderAddress] = useState('')
  const [copied, setCopied] = useState(false)

  const params = location.state || {}
  const { type, pendingSignupId, userId, pointsAmount, usdAmount, userEmail, userName } = params

  useEffect(() => {
    fetchWallets()
  }, [])

  const fetchWallets = async () => {
    const { data, error } = await supabase
      .from('crypto_wallets')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (!error && data && data.length > 0) {
      setWallets(data)
      setSelectedWallet(data[0])
    } else {
      setWallets([{
        id: 1,
        address: 'TGe4MXjBtZ366M2qQkNqu94LcrAGBjkoFf',
        network: 'TRC20',
        label: 'Main Wallet',
        display_order: 1
      }])
      setSelectedWallet({ id: 1, address: 'TGe4MXjBtZ366M2qQkNqu94LcrAGBjkoFf' })
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generateQRUrl = (address) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${address}`
  }

  const handleConfirmPayment = async () => {
    if (!transactionHash.trim()) {
      setError('Please enter your transaction hash')
      return
    }
    
    if (!senderAddress.trim()) {
      setError('Please enter your sender wallet address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Get user info for display in admin panel
      let finalUserEmail = userEmail
      let finalUserName = userName
      let finalUserId = userId
      
      if (type === 'purchase' && session?.user) {
        // Load points - logged in user
        finalUserEmail = session.user.email
        finalUserName = session.user.user_metadata?.name || session.user.email
        finalUserId = session.user.id
      }
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/user-confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          userId: finalUserId,
          pendingSignupId: pendingSignupId,
          pointsAmount: pointsAmount,
          usdAmount: usdAmount,
          transactionHash: transactionHash.trim(),
          senderAddress: senderAddress.trim(),
          userEmail: finalUserEmail,
          userName: finalUserName,
          type: type || (pendingSignupId ? 'registration' : 'purchase')
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          if (type === 'registration' || pendingSignupId) {
            navigate('/login?message=Payment+submitted.+Admin+will+review+shortly.')
          } else {
            navigate('/dashboard?message=Payment+submitted.+Points+will+be+added+after+approval.')
          }
        }, 3000)
      } else {
        setError(result.error || 'Failed to submit payment confirmation')
      }
    } catch (err) {
      console.error('Error submitting payment:', err)
      setError('Error submitting payment confirmation')
    } finally {
      setLoading(false)
    }
  }

  const displayAmount = usdAmount || (type === 'registration' ? 250 : pointsAmount ? pointsAmount / 200 : 0)

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a2a 0%, #1a1a3a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#1a1a3a', padding: '30px', borderRadius: '20px', maxWidth: '600px', width: '100%', border: '2px solid #ffa502' }}>
        
        {!success ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>💎</div>
              <h2 style={{ color: '#ffa502', marginBottom: '5px' }}>Manual Crypto Payment</h2>
              <p style={{ color: '#aaa' }}>Send USDT (TRC20) to complete your transaction</p>
            </div>

            <div style={{ background: '#0a0a2a', padding: '15px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center' }}>
              <p style={{ color: '#888', fontSize: '12px', marginBottom: '5px' }}>Amount to Send</p>
              <p style={{ color: '#00ff88', fontSize: '28px', fontWeight: 'bold', margin: 0 }}>${displayAmount.toFixed(2)} USDT</p>
              {pointsAmount && <p style={{ color: '#aaa', fontSize: '12px', marginTop: '5px' }}>({pointsAmount.toLocaleString()} points)</p>}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#aaa', marginBottom: '10px' }}>Send to one of these addresses:</p>
              
              {wallets.map((wallet) => (
                <div 
                  key={wallet.id}
                  onClick={() => setSelectedWallet(wallet)}
                  style={{ 
                    background: selectedWallet?.id === wallet.id ? '#ffa50220' : '#0a0a2a',
                    border: selectedWallet?.id === wallet.id ? '1px solid #ffa502' : '1px solid #333',
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#00ccff', fontSize: '12px' }}>{wallet.label || `Wallet ${wallet.display_order}`}</span>
                      <code style={{ display: 'block', color: '#00ff88', fontSize: '11px', wordBreak: 'break-all', marginTop: '5px' }}>
                        {wallet.address}
                      </code>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(wallet.address) }}
                      style={{ background: '#333', border: 'none', borderRadius: '5px', padding: '8px 12px', cursor: 'pointer', color: 'white' }}
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
              ))}

              {copied && <p style={{ color: '#00ff88', fontSize: '12px', marginTop: '5px' }}>✓ Address copied to clipboard!</p>}
            </div>

            {selectedWallet && (
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <button
                  onClick={() => setShowQR(!showQR)}
                  style={{ background: '#333', border: 'none', borderRadius: '5px', padding: '8px 16px', cursor: 'pointer', color: '#00ccff', fontSize: '12px' }}
                >
                  {showQR ? 'Hide QR Code' : 'Show QR Code'}
                </button>
                
                {showQR && (
                  <div style={{ marginTop: '15px' }}>
                    <img 
                      src={generateQRUrl(selectedWallet.address)} 
                      alt="QR Code"
                      style={{ width: '150px', height: '150px', background: 'white', padding: '10px', borderRadius: '10px' }}
                    />
                    <p style={{ color: '#888', fontSize: '10px', marginTop: '5px' }}>Scan with your wallet app</p>
                  </div>
                )}
              </div>
            )}

            <div style={{ background: '#0a0a2a', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
              <p style={{ color: '#ffa502', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>📋 Instructions:</p>
              <ol style={{ color: '#aaa', fontSize: '12px', margin: 0, paddingLeft: '20px' }}>
                <li style={{ marginBottom: '5px' }}>Copy one of the wallet addresses above</li>
                <li style={{ marginBottom: '5px' }}>Send exactly <strong>${displayAmount.toFixed(2)} USDT</strong> to that address (TRC20 network)</li>
                <li style={{ marginBottom: '5px' }}>After sending, paste your transaction hash and sender address below</li>
                <li>Click "Confirm Crypto Payment" to submit for admin approval</li>
              </ol>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: '8px' }}>Transaction Hash:</label>
              <input
                type="text"
                value={transactionHash}
                onChange={(e) => setTransactionHash(e.target.value)}
                placeholder="Enter the transaction hash from your wallet"
                style={{ width: '100%', padding: '12px', background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: '8px' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#aaa', display: 'block', marginBottom: '8px' }}>Your Sender Wallet Address:</label>
              <input
                type="text"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                placeholder="Enter your wallet address (for verification)"
                style={{ width: '100%', padding: '12px', background: '#0a0a2a', color: 'white', border: '1px solid #ffa502', borderRadius: '8px' }}
              />
              <p style={{ color: '#888', fontSize: '10px', marginTop: '5px' }}>
                This helps admin verify the payment came from you
              </p>
            </div>

            {error && (
              <div style={{ background: '#ff444420', border: '1px solid #ff4444', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>
                <p style={{ color: '#ff6666', fontSize: '12px', margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleConfirmPayment}
              disabled={loading || !transactionHash.trim() || !senderAddress.trim()}
              style={{ 
                width: '100%', 
                padding: '14px', 
                background: (!transactionHash.trim() || !senderAddress.trim() || loading) ? '#555' : '#ffa502', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: 'bold', 
                cursor: (!transactionHash.trim() || !senderAddress.trim() || loading) ? 'not-allowed' : 'pointer',
                color: '#0a0a2a',
                fontSize: '16px'
              }}
            >
              {loading ? 'Submitting...' : '✓ Confirm Crypto Payment'}
            </button>

            <p style={{ textAlign: 'center', color: '#888', fontSize: '11px', marginTop: '15px' }}>
              ⚠️ Your payment will be reviewed by admin. You will be notified once approved.
            </p>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#00ff88', marginBottom: '10px' }}>Payment Submitted!</h2>
            <p style={{ color: '#aaa', marginBottom: '20px' }}>
              Your payment confirmation has been submitted. Admin will review and approve shortly.
            </p>
            <p style={{ color: '#888', fontSize: '12px' }}>Redirecting...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ManualCryptoPage