import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as Icons from 'lucide-react';

const ToolCard = ({ tool }) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (!tool) return null;

  // Resolve Lucide icons dynamically
  const IconComponent = Icons[tool?.icon] || Icons.FileText;
  const toolName = tool?.name || 'PDF Tool';
  const toolDesc = tool?.desc || 'Process your PDF files safely.';

  const handleClick = (e) => {
    if (tool?.requiresAuth && !user) {
      e.preventDefault();
      e.stopPropagation();
      setShowModal(true);
    }
  };

  const handleCloseModal = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(false);
  };

  if (tool?.isPlaceholder) {
    return (
      <div
        className="relative bg-white/70 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-100/80 dark:border-slate-800/80 shadow-premium dark:shadow-none flex flex-col items-start text-left min-h-[190px] md:min-h-[220px] justify-start opacity-75 select-none transition-colors"
      >
        <div className="absolute top-4 right-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
          Soon
        </div>
        <div className="w-full">
          {/* Icon wrapper at the top */}
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-5 shrink-0">
            <IconComponent size={24} />
          </div>
          
          {/* Title */}
          <h3 className="font-extrabold text-slate-500 dark:text-slate-400 text-lg leading-snug">
            {toolName}
          </h3>
          
          {/* Description */}
          <p className="text-slate-400 dark:text-slate-500 text-xs leading-relaxed mt-2 line-clamp-3">
            {toolDesc}
          </p>
        </div>
      </div>
    );
  }

  // Determine target path
  const targetRoute = tool?.requiresAuth ? '/ai-hub' : `/tool/${tool?.id || ''}`;

  return (
    <>
      <Link
        to={targetRoute}
        onClick={handleClick}
        className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 hover:border-primary/25 dark:hover:border-primary/45 shadow-premium dark:shadow-none hover:shadow-lg dark:hover:shadow-none hover:-translate-y-1.5 transition-all duration-200 flex flex-col items-start text-left min-h-[190px] md:min-h-[220px] justify-start cursor-pointer relative"
      >
        <div className="w-full">
          {/* AI Badge indicator */}
          {tool?.requiresAuth && (
            <div className="absolute top-4 right-4 bg-primary/10 dark:bg-primary/20 text-primary text-[8px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-0.5 tracking-wider">
              <Icons.Sparkles size={8} className="animate-pulse" />
              <span>AI</span>
            </div>
          )}

          {/* Icon wrapper at the top */}
          <div className="w-12 h-12 rounded-xl bg-primary/5 dark:bg-primary/10 text-primary flex items-center justify-center transition-transform duration-200 group-hover:scale-110 mb-5 shrink-0">
            <IconComponent size={24} />
          </div>
          
          {/* Title */}
          <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-lg leading-snug group-hover:text-primary transition-colors">
            {toolName}
          </h3>
          
          {/* Description */}
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mt-2 line-clamp-3">
            {toolDesc}
          </p>
        </div>
      </Link>

      {/* Auth Prompt Modal */}
      {showModal && (
        <div 
          onClick={handleCloseModal}
          className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-premium dark:shadow-none rounded-2xl p-7 max-w-sm w-full relative overflow-hidden animate-float flex flex-col items-center"
          >
            {/* Top decorative stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-primary-light"></div>
            
            <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4 mt-2 shrink-0">
              <Icons.Cpu size={22} className="animate-pulse-slow" />
            </div>

            <h3 className="text-slate-900 dark:text-slate-100 font-black text-lg tracking-tight text-center leading-snug">
              Unlock AI Power!
            </h3>
            
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold text-center mt-2.5 leading-relaxed">
              Please Log In or Sign Up to access advanced AI tools and start chatting with your PDF documents.
            </p>

            <div className="flex flex-col gap-2.5 w-full mt-6">
              <Link 
                to="/login"
                onClick={() => setShowModal(false)}
                className="w-full bg-primary hover:bg-primary-dark text-white rounded-xl py-2.5 px-4 font-bold text-xs shadow-sm transition-colors text-center flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Log In</span>
                <Icons.ArrowRight size={13} />
              </Link>
              <Link 
                to="/signup"
                onClick={() => setShowModal(false)}
                className="w-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl py-2.5 px-4 font-bold text-xs transition-colors text-center cursor-pointer bg-white dark:bg-slate-900"
              >
                Sign Up
              </Link>
            </div>

            <button 
              onClick={handleCloseModal}
              className="text-slate-400 hover:text-slate-500 text-xs font-bold transition-colors cursor-pointer mt-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ToolCard;
