import React from 'react';
import { Link } from 'react-router-dom';
import AdBanner from './AdBanner';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 pt-12 pb-24 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Vision */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-white font-extrabold text-lg mb-4">
              PDF<span className="text-accent">Forge</span>
            </h3>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              We forge free, lightning-fast PDF tools for everyone. Merge, split, encrypt, convert, and format documents in seconds with absolute privacy. No registry, no limitations.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/tool/merge" className="hover:text-white transition-colors">Merge PDF</Link></li>
              <li><Link to="/tool/split" className="hover:text-white transition-colors">Split PDF</Link></li>
              <li><Link to="/tool/pdf2jpg" className="hover:text-white transition-colors">PDF to JPG</Link></li>
              <li><Link to="/tool/pdf2word" className="hover:text-white transition-colors">PDF to Word</Link></li>
            </ul>
          </div>

          {/* Legal / Contact */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/api-docs" className="hover:text-white transition-colors">API Docs</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-12 pt-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} PDFForge. Built for maximum performance and absolute data privacy.</p>
          <p className="mt-2 text-slate-600">All uploaded documents are deleted automatically from our secure servers within 30 minutes.</p>
        </div>
      </div>
      
      {/* Sticky Bottom Anchor Ad for monetization */}
      <AdBanner slot="sticky-footer" />
    </footer>
  );
};

export default Footer;
