import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'

const Signup = () => {
  const { signUp, user } = useAuth()
  const navigate = useNavigate()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [awaitingVerification, setAwaitingVerification] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      navigate('/profile')
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResendSuccess(false)
    
    try {
      await signUp(email, password)
      setAwaitingVerification(true)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to register account.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendLink = async () => {
    setResendLoading(true)
    setError('')
    setResendSuccess(false)
    try {
      await signUp(email, password)
      setResendSuccess(true)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to resend confirmation link.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to initialize Google signup.')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-180px)] px-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-premium dark:shadow-none rounded-2xl p-8 max-w-md w-full relative overflow-hidden opacity-0 animate-fade-in-up transition-colors duration-200">
        {/* Top Decorative bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent to-accent-light"></div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold flex items-start gap-2.5 transition-colors duration-150">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {awaitingVerification ? (
          /* Verification Required Screen */
          <div className="space-y-6 text-center">
            <div className="text-center mb-4 mt-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center justify-center gap-1.5">
                Verification Required
              </h2>
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto my-6 animate-pulse">
                <Mail size={28} />
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs font-semibold leading-relaxed max-w-sm mx-auto">
                We have sent a confirmation link to <span className="text-slate-800 dark:text-slate-200 font-bold block mt-1">{email}</span>. Please click the link in your email to verify your account and activate it.
              </p>
            </div>

            {resendSuccess && (
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/40 text-green-700 dark:text-green-400 text-xs font-semibold transition-all">
                Confirmation link resent successfully!
              </div>
            )}

            <div className="flex flex-col gap-2.5 w-full pt-2">
              <button
                type="button"
                onClick={handleResendLink}
                disabled={resendLoading}
                className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-950 rounded-xl py-2.5 px-4 font-bold text-xs transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {resendLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Resending Link...</span>
                  </>
                ) : (
                  <>
                    <span>Resend Link</span>
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setAwaitingVerification(false)}
                className="w-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 text-xs font-bold text-center mt-1 cursor-pointer bg-transparent border-none focus:outline-none"
              >
                Back to Signup
              </button>
            </div>
          </div>
        ) : (
          /* Standard Email/Password Signup Form */
          <>
            <div className="text-center mb-6 mt-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center justify-center gap-1.5 transition-colors">
                Create Account
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-1.5 transition-colors">
                Get 50 free credits instantly to start forging PDFs with AI
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="developer@example.com"
                    className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium placeholder:text-slate-400 text-slate-800 dark:text-slate-100 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium placeholder:text-slate-400 text-slate-800 dark:text-slate-100 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-950 rounded-xl py-2.5 px-4 font-bold text-sm transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-800"></span>
              </div>
              <span className="relative bg-white dark:bg-slate-900 px-3 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider transition-colors">
                or
              </span>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              className="w-full border border-slate-200/80 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 rounded-xl py-2.5 px-4 font-bold text-sm transition-colors duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-sm bg-white dark:bg-slate-900"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.5 15 0 12 0 7.4 0 3.4 2.6 1.4 6.6l3.9 3c1-3 3.8-4.56 6.7-4.56z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.6c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2l-3.9-3C.5 9.1 0 10.5 0 12s.5 2.9 1.4 4.4l3.9-3z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.2 0 6-1.1 8-2.9l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-2.9 0-5.7-1.56-6.7-4.56l-3.9 3C3.4 21.4 7.4 24 12 24z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <p className="text-center text-slate-500 dark:text-slate-400 text-xs font-semibold mt-6 transition-colors">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-bold">
                Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default Signup
