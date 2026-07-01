import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Menu, X, Layers, Scissors, Settings } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-primary font-extrabold text-xl tracking-tight">
              <div className="bg-primary hover:bg-primary-dark p-2 rounded-lg text-white transition-all shadow-md shadow-primary/20">
                <FileText size={20} />
              </div>
              <span className="text-slate-900 font-black">PDF</span>
              <span className="text-accent font-bold">Forge</span>
            </Link>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-slate-600 hover:text-primary font-medium text-sm transition-colors">
              All PDF Tools
            </Link>
            <Link to="/tool/merge" className="text-slate-600 hover:text-primary font-medium text-sm flex items-center gap-1.5 transition-colors">
              <Layers size={14} /> Merge
            </Link>
            <Link to="/tool/split" className="text-slate-600 hover:text-primary font-medium text-sm flex items-center gap-1.5 transition-colors">
              <Scissors size={14} /> Split
            </Link>
            <Link to="/tool/protect" className="text-slate-600 hover:text-primary font-medium text-sm flex items-center gap-1.5 transition-colors">
              <Settings size={14} /> Protect
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-600 hover:text-slate-900 p-2 focus:outline-none"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white py-4 px-6 space-y-3 shadow-inner">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="block text-slate-700 hover:text-primary font-semibold text-sm py-2"
          >
            All PDF Tools
          </Link>
          <Link
            to="/tool/merge"
            onClick={() => setIsOpen(false)}
            className="block text-slate-700 hover:text-primary font-semibold text-sm py-2"
          >
            Merge PDF
          </Link>
          <Link
            to="/tool/split"
            onClick={() => setIsOpen(false)}
            className="block text-slate-700 hover:text-primary font-semibold text-sm py-2"
          >
            Split PDF
          </Link>
          <Link
            to="/tool/protect"
            onClick={() => setIsOpen(false)}
            className="block text-slate-700 hover:text-primary font-semibold text-sm py-2"
          >
            Protect PDF
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
