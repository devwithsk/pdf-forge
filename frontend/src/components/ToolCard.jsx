import React from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';

const ToolCard = ({ tool }) => {
  // Resolve Lucide icons dynamically
  const IconComponent = Icons[tool.icon] || Icons.FileText;

  return (
    <Link
      to={`/tool/${tool.id}`}
      className="group bg-white p-6 rounded-2xl border border-slate-100 hover:border-primary/20 shadow-premium hover:shadow-premium-hover transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
    >
      <div>
        <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all duration-300 mb-4">
          <IconComponent size={22} />
        </div>
        <h3 className="font-extrabold text-slate-800 text-base md:text-lg group-hover:text-primary transition-colors">
          {tool.name}
        </h3>
        <p className="text-slate-500 text-xs md:text-sm mt-2 leading-relaxed">
          {tool.desc}
        </p>
      </div>
      <div className="mt-6 flex items-center text-xs font-bold text-primary group-hover:text-primary-dark transition-colors uppercase tracking-wider gap-1">
        Start Tool 
        <span className="transform group-hover:translate-x-1 transition-transform">→</span>
      </div>
    </Link>
  );
};

export default ToolCard;
