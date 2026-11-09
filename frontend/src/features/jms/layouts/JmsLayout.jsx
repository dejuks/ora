import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { portalsFor, portalOf } from '../roles';
import { 
  AppstoreOutlined, TeamOutlined, TagsOutlined, 
  FolderOpenOutlined, SettingOutlined, BarChartOutlined,
  SearchOutlined, BellOutlined, 
  SunOutlined, MoonOutlined, DownOutlined, 
  LayoutOutlined, LogoutOutlined, UserOutlined,
  FileTextOutlined, PlusOutlined, MessageOutlined,
  CheckCircleOutlined, SafetyCertificateOutlined, ClockCircleOutlined
} from '@ant-design/icons';

export const sidebarPresets = {
  maroon: {
    name: 'Classic Maroon',
    bg: 'bg-gradient-to-b from-[#531324] to-[#2D0A14] border-r border-[#3D0F1C]',
    text: 'text-[#E0C3D0]',
    activeBg: 'bg-white text-[#7A1849] shadow-lg scale-[1.02]',
    activeText: 'text-[#7A1849]',
    hover: 'hover:bg-white/10 hover:text-white',
    icon: 'text-[#E0C3D0]',
  },
  light: {
    name: 'Clean Light',
    bg: 'bg-white border-r border-gray-200',
    text: 'text-gray-600',
    activeBg: 'bg-[#7A1849] text-white shadow-md',
    activeText: 'text-white',
    hover: 'hover:bg-[#FCF7F9] hover:text-[#7A1849]',
    icon: 'text-gray-500',
  },
  solid: {
    name: 'Bold Solid',
    bg: 'bg-[#7A1849] border-r border-[#5E1136]',
    text: 'text-[#F3D5E1]',
    activeBg: 'bg-[#531324] text-white shadow-lg border border-white/10',
    activeText: 'text-white',
    hover: 'hover:bg-white/10 hover:text-white',
    icon: 'text-[#F3D5E1]',
  },
  emerald: {
    name: 'Deep Emerald',
    bg: 'bg-gradient-to-b from-[#064E3B] to-[#022C22] border-r border-[#065F46]',
    text: 'text-[#A7F3D0]',
    activeBg: 'bg-[#10B981] text-white shadow-lg',
    activeText: 'text-white',
    hover: 'hover:bg-[#059669]/50 hover:text-white',
    icon: 'text-[#6EE7B7]',
  },
  royal: {
    name: 'Royal Blue',
    bg: 'bg-gradient-to-b from-[#1E3A8A] to-[#172554] border-r border-[#1E40AF]',
    text: 'text-[#BFDBFE]',
    activeBg: 'bg-[#3B82F6] text-white shadow-lg',
    activeText: 'text-white',
    hover: 'hover:bg-[#2563EB]/50 hover:text-white',
    icon: 'text-[#93C5FD]',
  },
  sunset: {
    name: 'Warm Sunset',
    bg: 'bg-gradient-to-b from-[#7C2D12] to-[#431407] border-r border-[#9A3412]',
    text: 'text-[#FED7AA]',
    activeBg: 'bg-[#EA580C] text-white shadow-lg',
    activeText: 'text-white',
    hover: 'hover:bg-[#C2410C]/50 hover:text-white',
    icon: 'text-[#FDBA74]',
  },
  dark: {
    name: 'Midnight (Dark)',
    bg: 'bg-[#1A1A1A] border-r border-[#2D2D2D]',
    text: 'text-gray-400',
    activeBg: 'bg-[#7A1849] text-white shadow-md',
    activeText: 'text-white',
    hover: 'hover:bg-[#2A2A2A] hover:text-white',
    icon: 'text-gray-400',
  }
};

export default function AdminLayout({ children }) {
  const { isDarkMode, setIsDarkMode, sidebarTheme, isTopNav, setIsTopNav } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user, logout } = useAuth();
  const portals = portalsFor(user);
  const portal = portalOf(currentPath);
  const displayName = user ? `${user.firstName} ${user.lastName}` : '';
  const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : '';
  const roleLabel = portals.find((x) => x.key === portal)?.label ?? '';

  // Path checks
  const isAuthorPath = currentPath.includes('author');
  const isEiCPath = currentPath.includes('eic');
  const isReviewerPath = currentPath.includes('reviewer');
  const isMEPath = currentPath.includes('managing-editor'); // <--- THIS WAS MISSING

  const activePresetKey = isDarkMode ? 'dark' : (sidebarTheme || 'maroon');
  const currentPreset = sidebarPresets[activePresetKey];

  const bgMain = isDarkMode ? 'bg-[#121212]' : 'bg-[#F8F9FA]';
  const bgHeader = isDarkMode ? 'bg-[#1E1E1E] border-[#2D2D2D]' : 'bg-white border-gray-200';
  const bgDropdown = isDarkMode ? 'bg-[#1E1E1E] border-[#2D2D2D]' : 'bg-white border-gray-200';
  const textMain = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const borderCol = isDarkMode ? 'border-[#2D2D2D]' : 'border-gray-200';
  const inputBg = isDarkMode ? 'bg-[#2A2A2A] border-[#3D3D3D] text-white' : 'bg-gray-50 border-gray-200 text-gray-900';

  const menuItems = isAuthorPath 
    ? [
        { name: 'Dashboard', icon: <AppstoreOutlined />, path: '/author/dashboard' },
        { name: 'My Submissions', icon: <FileTextOutlined />, path: '/author/submissions' },
        { name: 'Pending Proof', icon: <CheckCircleOutlined />, path: '/author/pending-proof' },
        { name: 'Publishing Fee', icon: <TagsOutlined />, path: '/author/fees' },
        { name: 'Settings', icon: <SettingOutlined />, path: '/author/settings' },
      ]
    : isEiCPath
    ? [
        { name: 'Dashboard', icon: <AppstoreOutlined />, path: '/eic/dashboard' },
        { name: 'Manuscript Screening', icon: <FileTextOutlined />, path: '/eic/screening' },
        { name: 'Assign Reviewers', icon: <TeamOutlined />, path: '/eic/assign-reviewers' },
        { name: 'Final Decisions', icon: <SafetyCertificateOutlined />, path: '/eic/final-decisions' },
        { name: 'Reports', icon: <BarChartOutlined />, path: '/eic/reports' },
        { name: 'Settings', icon: <SettingOutlined />, path: '/eic/settings' },
      ]
    : isReviewerPath
    ? [
        { name: 'Dashboard', icon: <AppstoreOutlined />, path: '/reviewer/dashboard' },
        { name: 'My Assignments', icon: <FileTextOutlined />, path: '/reviewer/assignments' },
        { name: 'Pending Review', icon: <ClockCircleOutlined />, path: '/reviewer/pending' },
        { name: 'Settings', icon: <SettingOutlined />, path: '/reviewer/settings' },
      ]
    : isMEPath
    ? [
        { name: 'Dashboard', icon: <AppstoreOutlined />, path: '/managing-editor/dashboard' },
        { name: 'Pending Production', icon: <ClockCircleOutlined />, path: '/managing-editor/pending-production' },
        { name: 'Published Manuscripts', icon: <CheckCircleOutlined />, path: '/managing-editor/published' },
        { name: 'Issues', icon: <TagsOutlined />, path: '/managing-editor/issues' },
        { name: 'Reports', icon: <BarChartOutlined />, path: '/managing-editor/reports' },
        { name: 'Settings', icon: <SettingOutlined />, path: '/managing-editor/settings' },
      ]
    : [
        { name: 'Dashboard', icon: <AppstoreOutlined />, path: '/admin/dashboard' },
        ...(user?.isSuperAdmin ? [{ name: 'Users', icon: <TeamOutlined />, path: '/users' }] : []),
        { name: 'Categories', icon: <TagsOutlined />, path: '/admin/categories' },
        { name: 'Article Types', icon: <FolderOpenOutlined />, path: '/admin/subjects' },
        { name: 'Messages', icon: <MessageOutlined />, path: '/admin/messages' },
        { name: 'Announcements', icon: <MessageOutlined />, path: '/admin/announcements' },
        { name: 'Journal Setting', icon: <SettingOutlined />, path: '/admin/settings' },
        { name: 'Report', icon: <BarChartOutlined />, path: '/admin/reports' },
      ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`flex flex-col h-screen font-sans transition-colors duration-300 ${bgMain}`}>
      
      {/* ================= TOP NAVIGATION LAYOUT ================= */}
      {isTopNav && (
        <div className={`flex flex-col border-b transition-colors duration-300 ${currentPreset.bg}`}>
          <div className="h-[72px] flex items-center justify-between px-8">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-3">
                <div className="bg-white rounded-full p-1 shadow-sm">
                  <img src="/oralogo.png" alt="ORA" className="h-7 w-auto" onError={(e) => e.target.style.display = 'none'} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-[16px] font-serif font-bold leading-tight ${currentPreset.text}`}>ORA</span>
                  <span className={`text-[8px] tracking-[0.2em] uppercase font-semibold opacity-80 ${currentPreset.text}`}>
                    {roleLabel}
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications (Top Nav) */}
              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className={`w-8 h-8 rounded-full flex items-center justify-center relative ${currentPreset.text} hover:bg-white/10 transition-colors`}>
                  <BellOutlined />
                  
                </button>
                {showNotifications && (
                  <div className={`absolute right-0 mt-2 w-80 rounded-xl shadow-lg border py-2 z-50 ${bgDropdown}`}>
                    <div className={`px-4 py-2 border-b mb-1 flex justify-between items-center ${borderCol}`}>
                      <p className={`text-[13px] font-bold ${textMain}`}>Notifications</p>
                      <span className="text-[10px] font-bold text-[#7A1849] bg-[#FCF7F9] px-2 py-0.5 rounded">Email</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <div className={`p-4 ${borderCol}`}>
                          <p className={`text-[12px] font-bold ${textMain}`}>Notifications are sent by email</p>
                          <p className={`text-[11px] ${textMuted}`}>Invitations, decisions, proofs and publication notices arrive in your inbox.</p>
                        </div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => setIsTopNav(false)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-white/20 ${currentPreset.text} hover:bg-white/10 transition-colors`}>
                <LayoutOutlined /> Side Layout
              </button>
              
              <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-8 h-8 rounded-full flex items-center justify-center ${currentPreset.text} hover:bg-white/10 transition-colors`}>
                {isDarkMode ? <SunOutlined /> : <MoonOutlined />}
              </button>
            </div>
          </div>

          <div className={`flex items-center gap-3 px-8 h-16 border-t border-white/10`}>
            {menuItems.map((item) => {
              const isActive = currentPath === item.path || (item.path !== '/dashboard' && currentPath.includes(item.path));
              return (
                <Link key={item.name} to={item.path} className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 flex items-center gap-2 ${isActive ? currentPreset.activeBg : `${currentPreset.text} ${currentPreset.hover}`}`}>
                  <span className="text-[15px]">{item.icon}</span> {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        
        {/* ==================== SIDEBAR LAYOUT ===================== */}
        {!isTopNav && (
          <aside className={`w-[250px] h-full flex-shrink-0 flex flex-col transition-all duration-300 ${currentPreset.bg}`}>
            <div className={`h-[72px] flex items-center px-6 border-b border-white/10`}>
              <Link to="/" className="flex items-center gap-3">
                <div className="bg-white rounded-full p-1 shadow-md">
                  <img src="/oralogo.png" alt="ORA Logo" className="h-7 w-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
                <div className="flex flex-col justify-center">
                  <span className={`text-[16px] font-serif font-bold leading-tight ${currentPreset.text}`}>ORA</span>
                  <span className={`text-[9px] tracking-[0.2em] uppercase font-semibold opacity-80 ${currentPreset.text}`}>Journal</span>
                </div>
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-4">
              <div className={`mb-6 px-3 py-2 rounded-xl border border-white/10 bg-white/5`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${currentPreset.text} opacity-80`}>
                  {roleLabel}
                </p>
              </div>
              
              <nav className="space-y-1.5">
                {menuItems.map((item) => {
                  const isActive = currentPath === item.path || (item.path !== '/dashboard' && currentPath.includes(item.path));
                  return (
                    <Link key={item.name} to={item.path} className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200 ${isActive ? currentPreset.activeBg : `${currentPreset.text} ${currentPreset.hover}`}`}>
                      <span className={`text-[16px] ${isActive ? currentPreset.activeText : currentPreset.icon}`}>{item.icon}</span> {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className={`p-4 border-t border-white/10`}>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm bg-white/20 backdrop-blur-sm ${currentPreset.text}`}>
                      {initials}
                    </div>
                    <div>
                      <p className={`text-[13px] font-bold ${currentPreset.text}`}>
                        {displayName}
                      </p>
                      <p className={`text-[10px] opacity-70 ${currentPreset.text}`}>
                        {roleLabel}
                      </p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className={`p-2 rounded-lg ${currentPreset.text} hover:bg-white/10 transition-colors`}>
                    <LogoutOutlined />
                  </button>
               </div>
            </div>
          </aside>
        )}

        {/* ================== MAIN CONTENT AREA ==================== */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!isTopNav && (
            <header className={`h-[72px] flex items-center justify-between px-8 border-b transition-colors duration-300 ${bgHeader}`}>
              <div className="relative w-[400px]">
                <SearchOutlined className="absolute left-3 top-2.5 text-gray-400" />
                <input type="text" placeholder="Search..." className={`w-full pl-9 pr-4 py-2 rounded-lg text-[13px] outline-none border ${inputBg} focus:border-[#7A1849]`} />
              </div>

              <div className="flex items-center gap-3">
                
                {/* Notifications (Side Nav) */}
                <div className="relative">
                  <button onClick={() => setShowNotifications(!showNotifications)} className={`w-8 h-8 rounded-full flex items-center justify-center relative ${isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                    <BellOutlined />
                    
                  </button>
                  {showNotifications && (
                    <div className={`absolute right-0 mt-2 w-80 rounded-xl shadow-lg border py-2 z-50 ${bgDropdown}`}>
                      <div className={`px-4 py-2 border-b mb-1 flex justify-between items-center ${borderCol}`}>
                        <p className={`text-[13px] font-bold ${textMain}`}>Notifications</p>
                        <span className="text-[10px] font-bold text-[#7A1849] bg-[#FCF7F9] px-2 py-0.5 rounded">Email</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <div className={`p-4 ${borderCol}`}>
                          <p className={`text-[12px] font-bold ${textMain}`}>Notifications are sent by email</p>
                          <p className={`text-[11px] ${textMuted}`}>Invitations, decisions, proofs and publication notices arrive in your inbox.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => setIsTopNav(true)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  <LayoutOutlined /> Top Layout
                </button>
                
                <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'hover:bg-gray-800 text-yellow-400' : 'hover:bg-gray-100 text-gray-600'}`}>
                  {isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                </button>
                
                <div className={`h-5 w-px mx-1 ${borderCol}`}></div>
                
                <div className="relative">
                  <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#7A1849] text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
                      {initials}
                    </div>
                    <DownOutlined className={`text-[10px] ${textMuted}`} />
                  </button>
                  {showProfileMenu && (
                    <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg border py-2 z-50 ${bgDropdown}`}>
                      <button onClick={() => navigate('/account')} className={`w-full text-left px-4 py-2 text-[13px] flex items-center gap-2 ${isDarkMode ? 'text-gray-300 hover:bg-[#2A2A2A]' : 'text-gray-700 hover:bg-gray-50'}`}>
                        <UserOutlined /> My Account
                      </button>
                      {portals.length > 1 && (
                        <div className={`border-t my-1 pt-1 ${borderCol}`}>
                          <p className={`px-4 py-1 text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>Switch portal</p>
                          {portals.map((x) => (
                            <button key={x.key} onClick={() => { setShowProfileMenu(false); navigate(x.home); }} className={`w-full text-left px-4 py-1.5 text-[12px] ${x.key === portal ? 'text-[#7A1849] font-bold' : isDarkMode ? 'text-gray-300 hover:bg-[#2A2A2A]' : 'text-gray-700 hover:bg-gray-50'}`}>
                              {x.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-[13px] flex items-center gap-2 text-red-500 hover:bg-red-50">
                        <LogoutOutlined /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>
          )}

          <main className="flex-1 overflow-y-auto p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}