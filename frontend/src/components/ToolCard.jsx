import React from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';

const ToolCard = ({ tool }) => {
  if (!tool) return null;

  // Resolve Lucide icons dynamically
  const IconComponent = Icons[tool?.icon] || Icons.FileText;
  const toolName = tool?.name || 'PDF Tool';
  const toolDesc = tool?.desc || 'Process your PDF files safely.';

  if (tool?.isPlaceholder) {
    return (
      <div
        className="relative bg-white/70 p-6 rounded-2xl border border-slate-100/80 shadow-premium flex flex-col items-start text-left min-h-[190px] md:min-h-[220px] justify-start opacity-75 select-none"
      >
        <div className="absolute top-4 right-4 bg-slate-100 text-slate-500 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
          Soon
        </div>
        <div className="w-full">
          {/* Icon wrapper at the top */}
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-5 shrink-0">
            <IconComponent size={24} />
          </div>
          
          {/* Title */}
          <h3 className="font-extrabold text-slate-500 text-lg leading-snug">
            {toolName}
          </h3>
          
          {/* Description */}
          <p className="text-slate-400 text-xs leading-relaxed mt-2 line-clamp-3">
            {toolDesc}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/tool/${tool?.id || ''}`}
      className="group bg-white p-6 rounded-2xl border border-slate-100 hover:border-primary/25 shadow-premium hover:shadow-lg hover:-translate-y-1.5 transition-all duration-200 flex flex-col items-start text-left min-h-[190px] md:min-h-[220px] justify-start cursor-pointer"
    >
      <div className="w-full">
        {/* Icon wrapper at the top */}
        <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center transition-transform duration-200 group-hover:scale-110 mb-5 shrink-0">
          <IconComponent size={24} />
        </div>
        
        {/* Title */}
        <h3 className="font-extrabold text-slate-800 text-lg leading-snug group-hover:text-primary transition-colors">
          {toolName}
        </h3>
        
        {/* Description */}
        <p className="text-slate-500 text-xs leading-relaxed mt-2 line-clamp-3">
          {toolDesc}
        </p>
      </div>
    </Link>
  );
};

export default ToolCard;
