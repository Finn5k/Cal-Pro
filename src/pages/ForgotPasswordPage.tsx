import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, AlertCircle, Loader, CheckCircle, ArrowLeft } from 'lucide-react'
import { resetPassword } from '@/services/auth'
import '@/styles/auth.css'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const result = await resetPassword(email)

    if (!result.success) {
      setError(result.error || 'Failed to send reset email')
      setIsLoading(false)
      return
    }

    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="success-icon">
            <CheckCircle size={64} />
          </div>
          <h1>Check Your Email</h1>
          <p className="auth-subtitle">
            We've sent a password reset link to <strong>{email}</strong>
          </p>

          <div className="success-message">
            <p>Click the link in the email to reset your password. The link expires in 1 hour.</p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            Back to Sign In
          </button>

          <p className="auth-link">
            <button
              type="button"
              className="link-button"
              onClick={() => setIsSubmitted(false)}
            >
              Try another email
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate('/login')}
          title="Back to Sign In"
        >
          <ArrowLeft size={20} />
        </button>

        <h1>Reset Password</h1>
        <p className="auth-subtitle">Enter your email to receive a reset link</p>

        <form onSubmit={handleResetPassword} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <Mail size={20} />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader size={18} className="spinner" />
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
