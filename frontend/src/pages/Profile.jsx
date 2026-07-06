import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { User, Mail, Phone, Pencil, Cpu, Shield, AlertCircle, CheckCircle, Loader } from 'lucide-react'

const Profile = () => {
  const { user } = useAuth()

  // Initialize input fields based on user session metadata
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text: string }
  const [showModal, setShowModal] = useState(false)

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (user) {
      setName(user?.user_metadata?.full_name || '')
      setPhone(user?.user_metadata?.phone || '')
    }
  }, [user])

  const fullName = user?.user_metadata?.full_name || 'PDF Forge User'
  const email = user?.email || 'user@example.com'
  const avatarUrl = user?.user_metadata?.avatar_url
  const userInitial = fullName.charAt(0).toUpperCase()

  // Save Name and Phone updates to Supabase Auth metadata
  const handleSaveChanges = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name,
          phone: phone
        }
      })

      if (error) throw error
      setMessage({ type: 'success', text: 'Profile changes saved successfully!' })
    } catch (err) {
      console.error('Error updating user metadata:', err)
      setMessage({ type: 'error', text: err.message || 'Failed to update profile settings.' })
    } finally {
      setSaving(false)
    }
  }

  // Trigger hidden file input click
  const handlePencilClick = () => {
    fileInputRef.current.click()
  }

  // Upload photo to Supabase avatars bucket
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setMessage(null)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload file to Supabase avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      // Fetch public link of the image
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update auth metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })

      if (updateError) throw updateError
      setMessage({ type: 'success', text: 'Avatar uploaded and updated successfully!' })
    } catch (err) {
      console.error('Error uploading avatar:', err)
      setMessage({ type: 'error', text: err.message || 'Failed to upload profile photo.' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 opacity-0 animate-fade-in-up">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight transition-colors">Account Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold mt-1 transition-colors">
          Manage your personal details, AI integrations, and billing balances.
        </p>
      </div>

      {/* Messages / Alerts */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 transition-colors ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/30 text-green-800 dark:text-green-400' 
            : 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-400'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle size={18} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
          )}
          <span className="text-xs font-semibold leading-normal">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Credits */}
        <div className="space-y-6">
          {/* Profile Overview Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-premium text-center relative overflow-hidden transition-colors">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-primary-light"></div>
            
            {/* Avatar image container with pencil edit overlay */}
            <div className="relative w-24 h-24 mx-auto mb-4 group cursor-pointer" onClick={handlePencilClick}>
              {uploading ? (
                <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-slate-100 dark:border-slate-800">
                  <Loader size={24} className="text-primary animate-spin" />
                </div>
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-full h-full rounded-full object-cover border-2 border-slate-100 dark:border-slate-800"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-3xl border-2 border-slate-100 dark:border-slate-800">
                  {userInitial}
                </div>
              )}
              {/* Pencil Edit Hover overlay */}
              <div className="absolute inset-0 bg-slate-900/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Pencil size={16} />
              </div>
            </div>

            {/* Hidden Input File */}
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />

            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg leading-snug transition-colors">{fullName}</h3>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold mt-1 truncate transition-colors">{email}</p>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-center items-center gap-2 transition-colors">
              <span className="bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/60 text-green-700 dark:text-green-400 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Active User
              </span>
            </div>
          </div>

          {/* Credits Summary Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-premium relative overflow-hidden transition-colors">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-amber-400"></div>
            
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 p-2 rounded-xl transition-colors">
                <Cpu size={18} className="animate-pulse-slow" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm transition-colors">AI Forging Credits</h4>
            </div>

            <div className="mb-4">
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight transition-colors">50</p>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold mt-1 transition-colors">Remaining prompts for Chat with PDF & AI Tools</p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 px-4 font-bold text-xs shadow-sm transition-colors text-center block cursor-pointer border-none"
            >
              Get More Credits
            </button>
          </div>
        </div>

        {/* Right Column: Account Details Form */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSaveChanges} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-8 shadow-premium transition-colors">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg tracking-tight border-b border-slate-100 dark:border-slate-800 pb-4 mb-6 transition-colors">
              Personal Information
            </h3>

            <div className="space-y-5">
              {/* Name Field */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 transition-colors">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              {/* Email Address Field (Read-only) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 transition-colors">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    readOnly
                    value={email}
                    className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-sm font-semibold focus:outline-none cursor-not-allowed select-none transition-colors"
                  />
                </div>
              </div>

              {/* Phone Number Field */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 transition-colors">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Phone size={16} />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary-dark text-white rounded-xl py-2.5 px-6 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving && <Loader size={12} className="animate-spin" />}
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>

            {/* Note alert */}
            <div className="mt-8 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-start gap-2.5 transition-colors">
              <Shield size={16} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
              <p>
                Your account details are linked to your secure login provider. Dynamic profile modifications and authentication credentials edits are managed via Supabase auth integrations.
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Premium Plans Mock Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-premium max-w-md w-full p-6 text-center relative overflow-hidden animate-float">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-amber-400"></div>
            
            <div className="mx-auto w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-4 transition-colors">
              <Cpu size={24} className="animate-pulse" />
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2 transition-colors">
              Premium Forging Plans Coming Soon!
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed mb-6 transition-colors">
              We are working hard to integrate secure Stripe payments. Very soon, you'll be able to purchase additional high-speed AI credits and unlock unlimited PDF document processing!
            </p>

            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl py-2.5 px-4 font-bold text-xs shadow-sm transition-colors cursor-pointer border-none"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
