import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { get } from '../../api';
import { useLoad } from '../../hooks';
import { fmtDate, statusLabel } from '../../format';
import AdminLayout from '../../layouts/JmsLayout';
import { useTheme } from '../../context/ThemeContext';
import { 
  FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined, 
  ArrowRightOutlined, BellOutlined,
  EyeOutlined
} from '@ant-design/icons';

export default function AuthorDashboard() {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const { data, loading, error } = useLoad(() => get('/author/dashboard'));
  const d = data || { total: 0, under_review: 0, pending_proofs: 0, pending_fees: 0, needs_revision: 0, published: 0, recent: [] };
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const bgCard = isDarkMode ? 'bg-[#1E1E1E] border-[#2D2D2D]' : 'bg-white border-gray-100';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const borderCol = isDarkMode ? 'border-[#2D2D2D]' : 'border-gray-100';

  return (
    <AdminLayout>
      <div className="max-w-[1300px] mx-auto animate-fade-in-up">
        
        {/* ================= HEADER BANNER ================= */}
        <div className={`relative overflow-hidden rounded-xl mb-6 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm ${isDarkMode ? 'bg-[#1E1E1E] border border-[#2D2D2D]' : 'bg-white border border-gray-100'}`}>
          
          <div className="relative z-10">
            <p className={`text-[10px] font-bold tracking-[0.1em] uppercase text-[#7A1849] mb-1.5`}>WORKSPACE / DASHBOARD</p>
            {/* Removed font-serif to match screenshot */}
            <h1 className={`text-[26px] font-bold tracking-tight mb-1 flex items-center gap-2 ${textMain}`}>
              {greeting}, {user?.firstName}
            </h1>
            <p className={`text-[13px] font-medium ${textMuted}`}>
              Here's what's happening with your research today.
            </p>
          </div>
          
          <div className="relative z-10 flex gap-3 w-full md:w-auto">
            <Link to="/author/submit" className="flex-1 md:flex-none bg-[#7A1849] text-white px-4 py-2 rounded-lg text-[12px] font-bold hover:bg-[#5E1136] transition-all shadow-sm flex items-center justify-center gap-2">
              New Submission
            </Link>
          </div>
        </div>

        {/* ================= STATS CARDS ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'My Manuscripts', value: String(d.total), sub: `${d.published} published`, icon: <FileTextOutlined />, color: 'text-blue-600 bg-blue-50', trendColor: 'text-green-500' },
            { label: 'In Editorial Process', value: String(d.under_review), sub: 'Awaiting decision', icon: <ClockCircleOutlined />, color: 'text-amber-600 bg-amber-50', trendColor: 'text-amber-500' },
            { label: 'Awaiting Proof', value: String(d.pending_proofs), sub: d.pending_proofs ? 'Action required' : 'Nothing pending', icon: <CheckCircleOutlined />, color: 'text-[#7A1849] bg-[#FCF7F9]', trendColor: d.pending_proofs ? 'text-red-500' : 'text-gray-400' },
          ].map((stat, i) => (
            <div key={i} className={`p-4 rounded-xl border shadow-sm flex items-center justify-between transition-all hover:-translate-y-0.5 hover:shadow-md ${bgCard}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className={`text-[11px] font-bold text-gray-400 uppercase tracking-wider`}>{stat.label}</p>
                  {/* Changed value to bold sans-serif */}
                  <h3 className={`text-[24px] font-bold tracking-tight ${textMain}`}>{stat.value}</h3>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-[11px] font-bold ${stat.trendColor}`}>{stat.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ================= RECENT ACTIVITY ================= */}
          <div className={`lg:col-span-2 p-6 rounded-xl border shadow-sm ${bgCard}`}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className={`text-[15px] font-bold tracking-tight ${textMain}`}>Recent Activity</h2>
                <p className={`text-[11px] font-medium mt-0.5 ${textMuted}`}>Latest updates on your submitted work.</p>
              </div>
              <Link to="/author/submissions" className="text-[12px] font-bold text-[#7A1849] hover:underline flex items-center gap-1">View all <ArrowRightOutlined className="text-[10px]" /></Link>
            </div>
            
            {error && <p className="text-[12px] text-red-600 mb-3">{error}</p>}
            {!loading && !error && d.recent.length === 0 && (
              <p className={`text-[13px] ${textMuted}`}>You have no manuscripts yet. <Link to="/author/submit" className="text-[#7A1849] font-bold hover:underline">Submit your first manuscript</Link>.</p>
            )}
            <div className={`relative border-l-2 ml-3 space-y-6 ${borderCol}`}>
              {d.recent.map((item) => (
                <div key={item.id} className="ml-5 relative">
                  <span className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#1E1E1E] ${item.status === 'PUBLISHED' || item.status === 'ACCEPTED' ? 'bg-green-500' : item.status === 'REJECTED' || item.status === 'DESK_REJECTED' ? 'bg-red-500' : item.status === 'DRAFT' ? 'bg-gray-400' : 'bg-[#7A1849]'} shadow-sm`}></span>
                  <Link to="/author/submissions" className={`block p-3.5 rounded-xl border transition-colors ${isDarkMode ? 'bg-[#2A2A2A] border-[#3D3D3D] hover:bg-[#333]' : 'bg-gray-50 border-gray-100 hover:bg-white'}`}>
                    <div className="flex justify-between items-start mb-0.5">
                      <h3 className={`text-[13px] font-bold ${textMain}`}>{statusLabel(item.status)}</h3>
                      <span className={`text-[10px] font-medium ${textMuted}`}>{fmtDate(item.updated_at)}</span>
                    </div>
                    <p className={`text-[12px] mb-1 ${textMuted}`}>"{item.title}"</p>
                    <p className={`text-[10px] font-bold text-[#7A1849]`}>{item.manuscript_no ? `${item.manuscript_no} · ` : ''}{item.journal_title}</p>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* ================= UPCOMING DEADLINES ================= */}
          <div className="space-y-6">
            <div className={`p-6 rounded-xl border shadow-sm ${bgCard}`}>
              <h2 className={`text-[15px] font-bold tracking-tight mb-5 flex items-center gap-2 ${textMain}`}>
                <BellOutlined className="text-[#7A1849]" /> Action Required
              </h2>
              
              <div className="space-y-4">
                {d.pending_proofs > 0 && (
                  <div className={`p-4 rounded-xl border-l-4 border-l-red-500 border-y border-r transition-colors ${isDarkMode ? 'bg-red-900/10 border-red-900/30' : 'bg-red-50 border-red-100'}`}>
                    <p className={`text-[12px] font-bold mb-1 ${textMain}`}>Author Proof Verification</p>
                    <p className="text-[11px] text-red-600/80 mb-2">{d.pending_proofs} proof{d.pending_proofs > 1 ? 's' : ''} waiting for your approval</p>
                    <Link to="/author/pending-proof" className="text-[11px] font-bold text-red-600 hover:underline">Review Proof →</Link>
                  </div>
                )}
                {d.needs_revision > 0 && (
                  <div className={`p-4 rounded-xl border-l-4 border-l-amber-500 border-y border-r transition-colors ${isDarkMode ? 'bg-amber-900/10 border-amber-900/30' : 'bg-amber-50 border-amber-100'}`}>
                    <p className={`text-[12px] font-bold mb-1 ${textMain}`}>Revision Submission</p>
                    <p className="text-[11px] text-amber-600/80 mb-2">{d.needs_revision} manuscript{d.needs_revision > 1 ? 's' : ''} need a revision</p>
                    <Link to="/author/submissions" className="text-[11px] font-bold text-amber-600 hover:underline">Upload Revision →</Link>
                  </div>
                )}
                {d.pending_fees > 0 && (
                  <div className={`p-4 rounded-xl border-l-4 border-l-blue-500 border-y border-r transition-colors ${isDarkMode ? 'bg-blue-900/10 border-blue-900/30' : 'bg-blue-50 border-blue-100'}`}>
                    <p className={`text-[12px] font-bold mb-1 ${textMain}`}>Publication Fee</p>
                    <p className="text-[11px] text-blue-600/80 mb-2">{d.pending_fees} fee{d.pending_fees > 1 ? 's' : ''} open</p>
                    <Link to="/author/fees" className="text-[11px] font-bold text-blue-600 hover:underline">View fees →</Link>
                  </div>
                )}
                {!d.pending_proofs && !d.needs_revision && !d.pending_fees && (
                  <p className={`text-[12px] ${textMuted}`}>Nothing needs your attention right now.</p>
                )}
              </div>
            </div>

            {/* Helpful Tip Card */}
            <div className={`p-5 rounded-xl border shadow-sm ${bgCard}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#FCF7F9] flex items-center justify-center"><EyeOutlined className="text-[#7A1849]" /></div>
                <h3 className={`text-[13px] font-bold ${textMain}`}>Increase Visibility</h3>
              </div>
              <p className={`text-[11px] leading-relaxed mb-3 ${textMuted}`}>Add your ORCID iD to your manuscript's author details so your work is linked to your researcher profile.</p>
              <Link to="/author/submit" className="text-[11px] font-bold text-[#7A1849] hover:underline">Add ORCID when you submit →</Link>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}