import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import * as Icons from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMegaOpen, setIsMegaOpen] = useState(false);
  const { categories } = useApp();

  const handleMouseEnter = () => setIsMegaOpen(true);
  const handleMouseLeave = () => setIsMegaOpen(false);

  return (
    <nav 
      className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm relative"
      onMouseLeave={handleMouseLeave}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-primary font-extrabold text-xl tracking-tight">
              <div className="bg-primary hover:bg-primary-dark p-2 rounded-lg text-white transition-all shadow-md shadow-primary/20">
                <Icons.FileText size={20} />
              </div>
              <span className="text-slate-900 font-black">PDF</span>
              <span className="text-accent font-bold">Forge</span>
            </Link>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-6">
            <div 
              className="py-5 cursor-pointer"
              onMouseEnter={handleMouseEnter}
            >
              <button 
                onClick={() => setIsMegaOpen(!isMegaOpen)}
                className="text-slate-700 hover:text-primary font-bold text-sm flex items-center gap-1 transition-colors focus:outline-none cursor-pointer"
              >
                All PDF Tools
                <Icons.ChevronDown size={14} className={`transition-transform duration-200 ${isMegaOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <Link to="/tool/merge" className="text-slate-600 hover:text-primary font-semibold text-sm flex items-center gap-1.5 transition-colors">
              <Icons.Layers size={14} /> Merge
            </Link>
            <Link to="/tool/split" className="text-slate-600 hover:text-primary font-semibold text-sm flex items-center gap-1.5 transition-colors">
              <Icons.Scissors size={14} /> Split
            </Link>
            <Link to="/tool/protect" className="text-slate-600 hover:text-primary font-semibold text-sm flex items-center gap-1.5 transition-colors">
              <Icons.Lock size={14} /> Protect
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-600 hover:text-slate-900 p-2 focus:outline-none"
              aria-label="Toggle menu"
            >
              {isOpen ? <Icons.X size={24} /> : <Icons.Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mega Menu Dropdown Centered Relative to <nav> */}
      {isMegaOpen && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 top-full w-[95vw] max-w-[1200px] bg-white border border-slate-100 rounded-2xl shadow-premium p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 z-50 animate-float"
          onMouseEnter={handleMouseEnter}
        >
          {categories.map((category) => (
            <div key={category.id} className="space-y-3">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1.5">
                {category.name}
              </h4>
              <ul className="space-y-1.5">
                {category.tools.map((t) => {
                  const IconComp = Icons[t.icon] || Icons.FileText;
                  if (t.isPlaceholder) {
                    return (
                      <li 
                        key={t.id} 
                        className="flex items-center gap-2 p-1.5 rounded-lg text-slate-400 cursor-not-allowed opacity-60 hover:bg-slate-50 transition-all group"
                        title="Coming Soon"
                      >
                        <IconComp size={14} className="shrink-0" />
                        <span className="text-xs font-semibold">{t.name}</span>
                        <span className="text-[8px] bg-slate-200 text-slate-600 px-1 rounded scale-90 opacity-70">Soon</span>
                      </li>
                    );
                  }
                  return (
                    <li key={t.id}>
                      <Link
                        to={`/tool/${t.id}`}
                        onClick={() => setIsMegaOpen(false)}
                        className="flex items-center gap-2 p-1.5 rounded-lg text-slate-700 hover:text-primary hover:bg-primary/5 transition-all group font-medium"
                      >
                        <IconComp size={14} className="text-slate-400 group-hover:text-primary transition-colors shrink-0" />
                        <span className="text-xs">{t.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white py-4 px-6 space-y-4 shadow-inner max-h-[80vh] overflow-y-auto">
          {categories.map((category) => (
            <div key={category.id} className="space-y-2">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                {category.name}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {category.tools.map((t) => {
                  const IconComp = Icons[t.icon] || Icons.FileText;
                  if (t.isPlaceholder) {
                    return (
                      <div 
                        key={t.id} 
                        className="flex items-center gap-2 p-1.5 text-slate-400 opacity-60 cursor-not-allowed"
                      >
                        <IconComp size={14} />
                        <span className="text-xs font-medium">{t.name}</span>
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={t.id}
                      to={`/tool/${t.id}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 p-1.5 text-slate-700 hover:text-primary transition-colors"
                    >
                      <IconComp size={14} className="text-slate-400" />
                      <span className="text-xs font-semibold">{t.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
