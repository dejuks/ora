import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { DownOutlined, SearchOutlined, GlobalOutlined } from '@ant-design/icons';

export default function GlobalHeader() {
  const [showModules, setShowModules] = useState(false);

  const modules = [
    { name: 'Journal Management', path: '/journal' },
    { name: 'eBook Platform', path: '/ebook' },
    { name: 'Library System', path: '/library' },
    { name: 'Oromo Wikipedia', path: '/wiki' },
    { name: 'Repository', path: '/repository' },
    { name: 'Researchers Network', path: '/network' },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[80px]">
          
          {/* Brand */}
          <Link to="/journal" className="flex items-center gap-3">
            <img src="/oralogo.png" alt="ORA" className="h-10 w-auto" onError={(e) => e.target.style.display = 'none'} />
            <div className="flex flex-col">
              <span className="text-[18px] font-serif font-bold text-gray-900 leading-tight">ORA Academic</span>
              <span className="text-[9px] text-gray-500 tracking-widest uppercase">Central Portal</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-8 text-[13px] font-bold uppercase tracking-wide text-gray-600">
            <Link to="/" className="text-[#7A1849]">Home</Link>
            
            {/* Module Dropdown */}
            <div className="relative" onMouseEnter={() => setShowModules(true)} onMouseLeave={() => setShowModules(false)}>
              <button className="flex items-center gap-1 hover:text-[#7A1849] transition-colors h-[80px]">
                Modules <DownOutlined className="text-[10px]" />
              </button>
              
              {showModules && (
                <div className="absolute top-[80px] left-0 w-64 bg-white border border-gray-100 shadow-xl rounded-b-xl py-2">
                  {modules.map(mod => (
                    <Link key={mod.name} to={mod.path} className="block px-5 py-3 text-[13px] text-gray-700 hover:bg-[#FCF7F9] hover:text-[#7A1849] font-semibold transition-colors border-b border-gray-50 last:border-0">
                      {mod.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link to="/about" className="hover:text-[#7A1849] transition-colors">About ORA</Link>
            <Link to="/contact" className="hover:text-[#7A1849] transition-colors">Contact Us</Link>
            <Link to="/register" className="hover:text-[#7A1849] transition-colors">Be a Member</Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button className="text-gray-500 hover:text-[#7A1849]"><SearchOutlined className="text-lg" /></button>
            <div className="h-5 w-px bg-gray-200"></div>
            <Link to="/login" className="text-[13px] font-bold text-gray-700 hover:text-[#7A1849]">Sign In</Link>
            <Link to="/register" className="text-[12px] font-bold bg-[#7A1849] text-white px-5 py-2.5 rounded-lg hover:bg-[#5E1136] transition shadow-md">
              Register
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}