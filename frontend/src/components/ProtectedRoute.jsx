import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        {/* Spinner using our theme primary color and custom spinner animation */}
        <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spinner"></div>
        <p className="text-slate-400 text-xs font-bold tracking-wider uppercase animate-pulse-slow">
          Authenticating...
        </p>
      </div>
    )
  }

  if (!user) {
    // Redirect to login page, saving the original requested route in state
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute
