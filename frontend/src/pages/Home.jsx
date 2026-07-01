import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import ToolCard from '../components/ToolCard';
import AdBanner from '../components/AdBanner';
import api from '../utils/api';
import { Search, Sparkles, FileText, CheckCircle } from 'lucide-react';

const Home = () => {
  const { tools, stats, setStats } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    // Fetch live statistics counters from database logs
    const fetchStats = async () => {
      try {
        const response = await api.get('/analytics');
        if (response.data && response.data.success) {
          setStats(response.data.data);
        }
      } catch (err) {
        console.warn('Analytics endpoint offline, showing simulated metric counter.');
      }
    };
    fetchStats();
  }, [setStats]);

  // Group tools by module
  const modules = [
    { name: 'Basic File Manipulation', desc: 'Merge, split, and rotate PDFs' },
    { name: 'Security & Formatting', desc: 'Secure, unlock, and watermark PDFs' },
    { name: 'Image Conversion', desc: 'Convert PDF pages to/from images' },
    { name: 'Document Conversion', desc: 'Convert Microsoft Office formats to/from PDF' }
  ];

  // Filter tools based on search term
  const filteredTools = tools.filter(tool => 
    tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    tool.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner Ad */}
      <AdBanner slot="header" />

      {/* Hero Section */}
      <div className="text-center my-12 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-wider mb-6 animate-pulse-slow">
          <Sparkles size={12} /> 100% Free PDF Tools
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight">
          Every tool you need to <span className="text-primary">Forge</span> PDFs
        </h1>
        <p className="text-slate-500 text-base md:text-lg mt-4 leading-relaxed font-medium">
          Zero sign-up wall. Drag and drop your documents to process them in seconds. Absolute privacy, absolute speed.
        </p>

        {/* Global conversion metrics banner */}
        <div className="mt-6 flex justify-center items-center gap-4 text-xs font-bold text-slate-600">
          <span className="flex items-center gap-1"><CheckCircle size={14} className="text-green-500" /> Secure Processing</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          <span className="flex items-center gap-1"><FileText size={14} className="text-primary" /> {stats.totalConversions || '5,420'}+ Files Forged Today</span>
        </div>

        {/* Search Bar */}
        <div className="mt-10 relative max-w-xl mx-auto shadow-md rounded-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Search PDF tools (e.g. Merge, Protect, Word to PDF...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm placeholder:text-slate-400 font-medium"
          />
        </div>
      </div>

      {/* Tools Grid */}
      {filteredTools.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400 font-medium">No tools found matching your query.</p>
        </div>
      ) : (
        <div className="space-y-16 mt-12">
          {modules.map(mod => {
            const moduleTools = filteredTools.filter(t => t.module === mod.name);
            if (moduleTools.length === 0) return null;
            
            return (
              <div key={mod.name} className="border-b border-slate-200/50 pb-12 last:border-b-0">
                <div className="mb-8">
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-primary inline-block"></span>
                    {mod.name}
                  </h2>
                  <p className="text-slate-500 text-xs md:text-sm mt-1">{mod.desc}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {moduleTools.map(tool => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Home;
