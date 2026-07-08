import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const Terms = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-slate-800 dark:text-slate-200">
      {/* Back link */}
      <div className="mb-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-6 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Shield size={20} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">
            Last Updated: July 8, 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
            1. Acceptance of Terms
          </h2>
          <p>
            Welcome to PDF Forge. By accessing or using our services, website, and tools, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
            2. Description of Service
          </h2>
          <p>
            PDF Forge provides free, online tools for manipulating and modifying PDF documents, including merging, splitting, converting, compressing, protecting, and unlocking files. We reserve the right to modify, suspend, or discontinue any part of the service at any time without notice.
          </p>
        </section>

        <section>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
            3. File Privacy & Security
          </h2>
          <p>
            We respect your privacy. All uploaded documents are automatically and permanently deleted from our secure servers within thirty (30) minutes of processing. We do not inspect, copy, analyze, or distribute your files. However, you are solely responsible for the content of the files you upload and process.
          </p>
        </section>

        <section>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
            4. Prohibited Uses
          </h2>
          <p>
            You agree not to use our services to:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
            <li>Upload or process any file that violates copyright, trademark, patent, or intellectual property laws.</li>
            <li>Process malicious files, including viruses, trojan horses, worms, or corrupted code.</li>
            <li>Attempt to probe, scan, test, or disrupt the vulnerability of our servers, networks, or applications.</li>
            <li>Use automated systems, scripts, or scrapers to execute bulk tasks without explicit permission.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
            5. Limitation of Liability
          </h2>
          <p>
            PDF Forge is provided "as is" and "as available" without warranties of any kind. We do not guarantee that the service will be uninterrupted, secure, or free of errors. Under no circumstances shall PDF Forge be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use our tools.
          </p>
        </section>

        <section>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
            6. Changes to Terms
          </h2>
          <p>
            We may revise these terms of service from time to time. The most current version will always be posted on our website. By continuing to access the service after changes become effective, you agree to be bound by the revised terms.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Terms;
