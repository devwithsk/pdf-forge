import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import * as Icons from 'lucide-react';


const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMegaOpen, setIsMegaOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { categories = [] } = useApp() || {};
  const { user, signOut } = useAuth();

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemPrefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleMouseEnter = () => setIsMegaOpen(true);
  const handleMouseLeave = () => setIsMegaOpen(false);

  return (
    <nav 
      className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 shadow-sm relative transition-colors duration-200"
      onMouseLeave={handleMouseLeave}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 relative">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-primary font-extrabold text-xl tracking-tight">
              <div className="bg-primary hover:bg-primary-dark p-2 rounded-lg text-white transition-all shadow-md shadow-primary/20">
                <Icons.FileText size={20} />
              </div>
              <span className="text-slate-900 dark:text-slate-100 font-black">PDF</span>
              <span className="text-accent font-bold">Forge</span>
            </Link>
          </div>

          {/* Desktop Nav Items (Centered in the middle of the Navbar) */}
          <div className="hidden md:flex items-center justify-center space-x-6 absolute left-1/2 -translate-x-1/2 top-0 bottom-0">
            <div 
              className="py-5 cursor-pointer"
              onMouseEnter={handleMouseEnter}
            >
              <button 
                onClick={() => setIsMegaOpen(!isMegaOpen)}
                className="text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary font-bold text-sm flex items-center gap-1 transition-colors focus:outline-none cursor-pointer"
              >
                All PDF Tools
                <Icons.ChevronDown size={14} className={`transition-transform duration-200 ${isMegaOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <Link to="/tool/merge" className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary font-semibold text-sm flex items-center gap-1.5 transition-colors">
              <Icons.Layers size={14} /> Merge
            </Link>
            <Link to="/tool/split" className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary font-semibold text-sm flex items-center gap-1.5 transition-colors">
              <Icons.Scissors size={14} /> Split
            </Link>
            <Link to="/tool/protect" className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary font-semibold text-sm flex items-center gap-1.5 transition-colors">
              <Icons.Lock size={14} /> Protect
            </Link>
          </div>

          {/* Desktop Auth Controls */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Desktop Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 focus:outline-none bg-white dark:bg-slate-900 shadow-sm dark:shadow-none"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Icons.Sun size={18} className="text-amber-500" />
              ) : (
                <Icons.Moon size={18} className="text-slate-400 dark:text-slate-500" />
              )}
            </button>

            {!user ? (
              <>
                <Link to="/login" className="border border-slate-200/80 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 text-slate-700 dark:text-slate-300 rounded-xl px-5 py-2.5 h-10 font-bold text-xs transition-colors flex items-center justify-center cursor-pointer bg-white dark:bg-slate-900 shadow-sm">
                  Log In
                </Link>
                <Link to="/signup" className="bg-primary hover:bg-primary-dark text-white rounded-xl px-5 py-2.5 h-10 font-bold text-xs transition-all shadow-sm shadow-primary/10 flex items-center justify-center gap-1.5 cursor-pointer">
                  <Icons.Sparkles size={12} className="animate-pulse" />
                  <span>Sign Up</span>
                </Link>
              </>
            ) : (
              <div 
                className="relative py-3"
                onMouseEnter={() => setIsDropdownOpen(true)}
                onMouseLeave={() => setIsDropdownOpen(false)}
              >
                {/* Profile Avatar Button */}
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-105 bg-slate-50 dark:bg-slate-800 focus:outline-none"
                >
                  {user?.user_metadata?.avatar_url ? (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt={user.user_metadata.full_name || 'User Avatar'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm uppercase">
                      {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-premium py-2.5 z-50 animate-float text-left transition-colors duration-200">
                    {/* User Profile Header (Disabled) */}
                    <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-700 mb-1.5">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate leading-none">
                        {user?.user_metadata?.full_name || 'PDF Forge User'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate mt-1 leading-none">
                        {user?.email}
                      </p>
                      <div className="mt-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 font-extrabold text-[9px] px-2 py-0.5 rounded-full flex items-center justify-center gap-1 w-max">
                        <span>⚡ AI Credits: 50</span>
                      </div>
                    </div>

                    {/* Dropdown Options */}
                    <Link 
                      to="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-primary/5 hover:text-primary dark:hover:bg-slate-700 transition-all"
                    >
                      <Icons.User size={13} className="text-slate-400 dark:text-slate-500" />
                      <span>Profile</span>
                    </Link>



                    <div className="border-t border-slate-50 dark:border-slate-700 my-1.5"></div>

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all text-left cursor-pointer border-none bg-transparent"
                    >
                      <Icons.LogOut size={13} className="text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
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
                        to={t.isAI ? "/ai-hub" : `/tool/${t.id}`}
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
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-6 space-y-4 shadow-inner max-h-[80vh] overflow-y-auto transition-colors duration-200">
          {/* Mobile Auth Section */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-2">
            {!user ? (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 text-slate-700 dark:text-slate-300 rounded-xl py-2.5 px-5 h-10 font-bold text-xs transition-colors flex items-center justify-center cursor-pointer bg-white dark:bg-slate-900 shadow-sm"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center bg-primary hover:bg-primary-dark text-white rounded-xl py-2.5 px-5 h-10 font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Icons.Sparkles size={12} className="animate-pulse" />
                  <span>Sign Up</span>
                </Link>

                <button
                  onClick={toggleTheme}
                  className="w-full mt-1.5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl py-2 px-4 font-bold text-xs transition-colors cursor-pointer border-none"
                >
                  <div className="flex items-center gap-1.5">
                    {theme === 'dark' ? (
                      <>
                        <Icons.Sun size={13} className="text-amber-500" />
                        <span>Theme: Light</span>
                      </>
                    ) : (
                      <>
                        <Icons.Moon size={13} className="text-slate-400 dark:text-slate-500" />
                        <span>Theme: Dark</span>
                      </>
                    )}
                  </div>
                  <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ${theme === 'dark' ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${theme === 'dark' ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                  </div>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase truncate max-w-[150px]">{user.email}</span>
                  <span className="bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 font-black text-[10px] px-2 py-0.5 rounded-full">
                    ⚡ 50 Credits
                  </span>
                </div>
                
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl py-2 px-4 font-bold text-xs transition-colors"
                >
                  <Icons.User size={13} className="text-slate-400 dark:text-slate-500" />
                  <span>View Profile</span>
                </Link>

                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl py-2 px-4 font-bold text-xs transition-colors cursor-pointer border-none"
                >
                  <div className="flex items-center gap-1.5">
                    {theme === 'dark' ? (
                      <>
                        <Icons.Sun size={13} className="text-amber-500" />
                        <span>Theme: Light</span>
                      </>
                    ) : (
                      <>
                        <Icons.Moon size={13} className="text-slate-400 dark:text-slate-500" />
                        <span>Theme: Dark</span>
                      </>
                    )}
                  </div>
                  <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 ${theme === 'dark' ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${theme === 'dark' ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    signOut();
                    setIsOpen(false);
                  }}
                  className="w-full text-center border border-red-100 dark:border-red-950/60 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 rounded-xl py-2 px-4 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer bg-transparent"
                >
                  <Icons.LogOut size={13} className="text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {categories.map((category) => (
            <div key={category.id} className="space-y-2">
              <h4 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {category.name}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {category.tools.map((t) => {
                  const IconComp = Icons[t.icon] || Icons.FileText;
                  if (t.isPlaceholder) {
                    return (
                      <div 
                        key={t.id} 
                        className="flex items-center gap-2 p-1.5 text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed"
                      >
                        <IconComp size={14} />
                        <span className="text-xs font-medium">{t.name}</span>
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={t.id}
                      to={t.isAI ? "/ai-hub" : `/tool/${t.id}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 p-1.5 text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors font-medium"
                    >
                      <IconComp size={14} className="text-slate-400 dark:text-slate-500" />
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
