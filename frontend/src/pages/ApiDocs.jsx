import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Terminal, Sparkles } from 'lucide-react';

const ApiDocs = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-800 dark:text-slate-200">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 shadow-premium dark:shadow-none rounded-3xl p-8 relative overflow-hidden text-center flex flex-col items-center">
        {/* Top gradient strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary to-accent"></div>
        
        {/* Under construction tag */}
        <div className="bg-primary/10 text-primary dark:bg-primary/20 text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 mb-6 mt-2 tracking-wider">
          <Sparkles size={10} className="animate-spin-slow" />
          <span>Coming Soon</span>
        </div>

        {/* Icon */}
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/80 rounded-2xl flex items-center justify-center text-primary dark:text-primary-light mb-6 transition-transform hover:scale-105 duration-300">
          <Terminal size={32} />
        </div>

        {/* Title */}
        <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
          API Documentation
        </h1>

        {/* Subtext */}
        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-3.5 leading-relaxed max-w-xs">
          Our developer API is currently under construction. Stay tuned for updates! Soon you will be able to integrate our high-speed PDF Forge engine into your own systems.
        </p>

        {/* Console line indicator */}
        <div className="mt-8 w-full bg-slate-950 text-emerald-400 font-mono text-[10px] p-3.5 rounded-xl text-left border border-slate-900 flex items-center gap-2 select-none">
          <span className="text-slate-500 shrink-0">$</span>
          <span className="animate-pulse">pdfforge --auth --connect-api</span>
        </div>

        {/* Back link */}
        <div className="mt-8 border-t border-slate-50 dark:border-slate-700/60 pt-6 w-full">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-xs font-black text-primary hover:text-primary-dark transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
