import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';

const Privacy = () => {
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
          <Eye size={20} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Privacy Policy
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
            1. Introduction
          </h2>
          <p>
            At PDF Forge, we are committed to protecting your personal data and files. This Privacy Policy describes how we collect, use, store, and process your information when you access or use our services.
          </p>
        </section>

        <section>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
            2. The Files You Process
          </h2>
          <p>
            All PDF and office files uploaded to our servers are strictly processed for formatting, conversion, or manipulation as requested by you. We do not look inside your files, store them beyond the processing period, or index them. All files are automatically deleted permanently within thirty (30) minutes of processing.
          </p>
        </section>

        <section>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
            3. Information We Collect
          </h2>
          <p>
            We may collect the following types of information:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
            <li><strong>Account Information:</strong> If you sign up or log in, we collect your name, email, and metadata (like avatars) through our authentication providers.</li>
            <li><strong>Usage Logs:</strong> We gather anonymous analytics (browser type, timestamp, processed tool type) to monitor statistics, diagnose server performance, and prevent service abuse.</li>
            <li><strong>Cookies:</strong> We use essential cookies to maintain your login session and local theme preferences.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
            4. Sharing of Data
          </h2>
          <p>
            We do not sell, trade, rent, or lease your personal information or uploaded files to third parties. Data is processed locally on our secure computing environment and is only shared with database/auth providers (such as Supabase) strictly to support active user sessions and account management.
          </p>
        </section>

        <section>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
            5. Data Retention
          </h2>
          <p>
            User account profiles are stored until deleted by the user. Contact messages are retained long enough to address support questions and are then deleted. Raw user-uploaded files are never retained for more than thirty (30) minutes under any circumstances.
          </p>
        </section>

        <section>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
            6. Your Rights
          </h2>
          <p>
            Depending on your location, you may have rights under GDPR, CCPA, or other data privacy laws to access, correct, delete, or limit the use of your personal account information. You can do so by contacting us or managing your details inside your user profile.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
