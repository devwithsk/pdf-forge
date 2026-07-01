import React, { useState, useEffect } from 'react';
import AdBanner from './AdBanner';

const ProcessingOverlay = ({ isVisible, statusText }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }

    // Simulate progress upload/processing
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) {
          clearInterval(interval);
          return 98; // Hold at 98% until server completes
        }
        const step = prev < 50 ? 5 : prev < 80 ? 3 : 1;
        return prev + step;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-[450px] bg-slate-50 border border-slate-200/80 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Spinner */}
        <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spinner"></div>
          <span className="font-extrabold text-sm text-slate-800">{progress}%</span>
        </div>

        {/* Status Text */}
        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider mb-2">
          {statusText || 'Forging Your PDF'}
        </h3>
        <p className="text-slate-500 text-xs max-w-sm mb-6 leading-relaxed">
          Please wait while our high-performance document engine processes your request. Do not close this window.
        </p>

        {/* Goldmine Ad Placement: Underneath processing loader */}
        <div className="mt-2 border-t border-slate-200/60 pt-6 w-full flex justify-center">
          <AdBanner slot="processing" />
        </div>
      </div>
    </div>
  );
};

export default ProcessingOverlay;
