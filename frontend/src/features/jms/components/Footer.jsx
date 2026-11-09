import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[#531324] pt-20 pb-10 text-white font-sans relative overflow-hidden">
      {/* Subtle decorative background element */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-[0.03]">
        <svg className="absolute -top-24 -right-24 w-96 h-96 text-white" fill="currentColor" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="50" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8 mb-16">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 pr-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-white rounded-full p-1 shadow-sm">
                <img 
                  src="/oralogo.png" 
                  alt="ORA Academic Journals" 
                  className="h-10 w-10 object-contain" 
                  onError={(e) => { e.target.style.display = 'none' }} 
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[18px] font-serif font-bold leading-tight tracking-wide text-white">ORA Academic</span>
                <span className="text-[10px] text-gray-400 tracking-[0.2em] uppercase font-semibold mt-0.5">Journals</span>
              </div>
            </div>
            
            <p className="text-[13px] text-gray-300 leading-relaxed mb-8 max-w-[300px]">
              Independent, open scholarly publishing committed to advancing Oromo knowledge and responsible research practice.
            </p>
            
            {/* Social Icons */}
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#7A1C39] hover:border-[#7A1C39] transition-all duration-300 hover:-translate-y-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#7A1C39] hover:border-[#7A1C39] transition-all duration-300 hover:-translate-y-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd"/></svg>
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#7A1C39] hover:border-[#7A1C39] transition-all duration-300 hover:-translate-y-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"/></svg>
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest mb-5 text-white">Publishing</h4>
            <ul className="space-y-3.5 text-[13px] text-gray-400">
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">Submit a manuscript</Link></li>
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">Author guidelines</Link></li>
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">Peer review process</Link></li>
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">Open access</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest mb-5 text-white">Resources</h4>
            <ul className="space-y-3.5 text-[13px] text-gray-400">
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">Browse journals</Link></li>
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">Subjects</Link></li>
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">For reviewers</Link></li>
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">For institutions</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest mb-5 text-white">Policies</h4>
            <ul className="space-y-3.5 text-[13px] text-gray-400">
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">Publication ethics</Link></li>
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">Editorial policies</Link></li>
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">Accessibility</Link></li>
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">Privacy</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest mb-5 text-white">Contact</h4>
            <ul className="space-y-3.5 text-[13px] text-gray-400">
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">Editorial office</Link></li>
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">Support centre</Link></li>
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">Partnerships</Link></li>
              <li><Link to="#" className="hover:text-white hover:pl-1 transition-all duration-200 block">Contact us</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-[11px] text-gray-400 gap-4">
          <p>© 2026 ORA Academic Journals. Research published for public benefit.</p>
          <div className="flex gap-6">
            <Link to="#" className="hover:text-white transition-colors">Terms</Link>
            <Link to="#" className="hover:text-white transition-colors">Cookies</Link>
            <Link to="#" className="hover:text-white transition-colors">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}