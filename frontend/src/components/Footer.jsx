import React from 'react';
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
              <li><a href="/tool/merge" className="hover:text-white transition-colors">Merge PDF</a></li>
              <li><a href="/tool/split" className="hover:text-white transition-colors">Split PDF</a></li>
              <li><a href="/tool/pdf2jpg" className="hover:text-white transition-colors">PDF to JPG</a></li>
              <li><a href="/tool/pdf2word" className="hover:text-white transition-colors">PDF to Word</a></li>
            </ul>
          </div>

          {/* Legal / Contact */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://google.com" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="https://google.com" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="https://google.com" className="hover:text-white transition-colors">API Docs</a></li>
              <li><a href="https://google.com" className="hover:text-white transition-colors">Contact Support</a></li>
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
