import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import supportAnimation from '../assets/support.lottie';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('General Inquiry');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', text: string }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !topic || !message.trim()) {
      setStatus({ type: 'error', text: 'All fields are required.' });
      return;
    }
    
    setLoading(true);
    setStatus(null);
    
    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([{ 
          name: name.trim(), 
          email: email.trim(), 
          topic, 
          message: message.trim() 
        }]);

      if (error) {
        throw error;
      }

      setStatus({ 
        type: 'success', 
        text: 'Thank you! Your message has been sent. Our support team will get back to you shortly.' 
      });

      // Send email notification via backend
      try {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const cleanBase = apiBase.replace(/\/+$/, '');
        const notifyUrl = `${cleanBase}/api/contact/notify`;
        await fetch(notifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            topic,
            message: message.trim(),
          }),
        });
      } catch (emailErr) {
        console.error('Failed to send contact notification email:', emailErr);
      }
      
      // Reset form
      setName('');
      setEmail('');
      setTopic('General Inquiry');
      setMessage('');
    } catch (err) {
      console.error(err);
      setStatus({ 
        type: 'error', 
        text: err.message || 'Failed to submit form. Please ensure the Supabase backend table exists.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12 md:py-16">
      {/* Back to Home */}
      <div className="mb-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Centered Page Header */}
      <div className="text-center mb-10 md:mb-12">
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          Contact Us
        </h1>
        <p className="text-slate-500 max-w-xl mx-auto text-center mt-2 text-sm md:text-base dark:text-slate-400">
          Have a question about our PDF tools, noticed a bug, or want to suggest a new feature? We would love to hear from you.
        </p>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12 items-center">
        
        {/* Left Column (Flattened Animation Container) */}
        <div className="flex flex-col items-center justify-center w-full h-full">
          <DotLottieReact
            src={supportAnimation}
            loop
            autoplay
            className="w-full max-w-lg lg:max-w-2xl transform scale-110 lg:scale-125 transition-transform"
          />
          <div className="mt-8 lg:mt-12 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium text-sm ring-1 ring-blue-500/20 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            24/7 Support Ready
          </div>
        </div>

        {/* Right Column (Premium Form Card) */}
        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-3xl p-8 lg:p-10 border border-slate-100 dark:border-slate-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Status Alert */}
            {status && (
              <div className={`p-4 rounded-xl border flex items-start gap-2.5 text-sm transition-all duration-300 ${
                status.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400' 
                  : 'bg-red-50 border-red-100 text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400'
              }`}>
                {status.type === 'success' ? (
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                )}
                <span className="leading-normal font-medium">{status.text}</span>
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Your Name
              </label>
              <input
                type="text"
                required
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300"
              />
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300"
              />
            </div>

            {/* Topic Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Support Topic
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all duration-300"
              >
                <option value="General Inquiry">General Inquiry</option>
                <option value="Bug Report">Bug Report</option>
                <option value="Feature Request">Feature Request</option>
              </select>
            </div>

            {/* Message Area */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Your Message
              </label>
              <textarea
                required
                rows={5}
                placeholder="Describe your issue or question in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all resize-none duration-300"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md hover:-translate-y-1 hover:shadow-lg active:translate-y-0 transition-all duration-300"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Sending Message...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Contact;
