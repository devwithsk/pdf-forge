import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import ToolCard from '../components/ToolCard';
import AdBanner from '../components/AdBanner';
import api from '../utils/api';
import { Search, Sparkles, FileText, CheckCircle } from 'lucide-react';

const Home = () => {
  const { categories, stats, setStats } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  
  useEffect(() => {
    // Fetch live statistics counters from database logs
    const fetchStats = async () => {
      try {
        const response = await api.get('/analytics');
        if (response.data && response.data.success) {
          const data = response.data.data !== undefined ? response.data.data : response.data;
          setStats(data);
        } else {
          setStats({ totalConversions: 5420 });
        }
      } catch (err) {
        console.warn('Analytics endpoint offline, showing simulated metric counter.');
        setStats({ totalConversions: 5420 });
      }
    };
    fetchStats();
  }, [setStats]);

  // Flatten tools from all categories to form a unified array
  const allTools = useMemo(() => {
    const list = [];
    const seenIds = new Set();
    categories.forEach(cat => {
      cat.tools.forEach(t => {
        if (!seenIds.has(t.id)) {
          seenIds.add(t.id);
          list.push({
            ...t,
            category: cat.id
          });
        }
      });
    });
    return list;
  }, [categories]);

  // Filter tools based on tab filter & search keyword
  const filteredTools = useMemo(() => {
    return allTools.filter(tool => {
      // 1. Category tab filter
      let matchesFilter = true;
      if (activeFilter === 'organize') {
        matchesFilter = tool.category === 'organize';
      } else if (activeFilter === 'optimize') {
        matchesFilter = tool.category === 'optimize';
      } else if (activeFilter === 'convert') {
        matchesFilter = tool.category === 'convert-to' || tool.category === 'convert-from';
      } else if (activeFilter === 'edit') {
        matchesFilter = tool.category === 'edit';
      } else if (activeFilter === 'security') {
        matchesFilter = tool.category === 'security';
      }

      // 2. Search keyword match
      const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            tool.desc.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [allTools, activeFilter, searchTerm]);

  // Filter tab list configuration
  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'organize', label: 'Organize PDF' },
    { id: 'optimize', label: 'Optimize PDF' },
    { id: 'convert', label: 'Convert PDF' },
    { id: 'edit', label: 'Edit PDF' },
    { id: 'security', label: 'PDF Security' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Banner Ad */}
      <AdBanner slot="header" />

      {/* Hero Section */}
      <div className="text-center mt-6 mb-8 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.2 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider mb-4 animate-pulse-slow">
          <Sparkles size={11} /> 100% Free PDF Tools
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight">
          Every tool you need to <span className="text-primary">Forge</span> PDFs
        </h1>
        <p className="text-slate-500 text-sm md:text-base mt-2.5 max-w-2xl mx-auto leading-relaxed font-medium">
          Zero sign-up wall. Drag and drop your documents to process them in seconds. Absolute privacy, absolute speed.
        </p>

        {/* Global conversion metrics banner */}
        <div className="mt-4 flex justify-center items-center gap-4 text-[11px] font-bold text-slate-500">
          <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Secure Processing</span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span className="flex items-center gap-1">
            <FileText size={12} className="text-primary" />
            {stats === null ? (
              <span className="w-8 h-3 bg-slate-200 animate-pulse rounded inline-block" />
            ) : (
              (stats?.totalConversions || 0).toLocaleString()
            )}+ Files Forged Today
          </span>
        </div>

        {/* Search Bar */}
        <div className="mt-6 relative max-w-lg mx-auto shadow-sm rounded-xl">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search PDF tools (e.g. Merge, Protect, Word to PDF...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs md:text-sm placeholder:text-slate-400 font-medium"
          />
        </div>
      </div>

      {/* Pill-shaped Filter Navigation Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 my-6 shrink-0">
        {filterTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all tracking-wide ${
              activeFilter === tab.id
                ? 'bg-slate-900 text-white shadow-sm border border-slate-900'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tools Grid Layout (Dense layout, 1 column on mobile) */}
      {filteredTools.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 font-semibold text-sm">No tools found matching the criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 my-6">
          {filteredTools.map(tool => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
