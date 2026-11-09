
import React, { useState } from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ArrowRightOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  UserAddOutlined,
} from "@ant-design/icons";

import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function UMLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const fullName = user
    ? `${user.firstName} ${user.lastName}`
    : "ORA Admin";

  const {
    isDarkMode,
    setIsDarkMode,
    sidebarTheme,
    setSidebarTheme,
    isTopNav,
    setIsTopNav,
  } = useTheme();

  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navigation = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: <BankOutlined />,
    },
    {
      label: "User Management",
      path: "/users",
      icon: <TeamOutlined />,
    },
    {
      label: "Role Management",
      path: "/roles",
      icon: <SafetyCertificateOutlined />,
    },
    {
      label: "Module Management",
      path: "/modules",
      icon: <UserAddOutlined />,
    },
    {
      label: "Branch Management",
      path: "/branches",
      icon: <BankOutlined />,
    },
    {
      label: "Reports & Analytics",
      path: "/reports",
      icon: <ArrowRightOutlined />,
    },
  ];

  const sidebarColors = {
    maroon: "bg-[#531324]",
    dark: "bg-[#171717]",
    navy: "bg-[#172554]",
    green: "bg-[#14532D]",
  };

  const sidebarBackground =
    sidebarColors[sidebarTheme] || sidebarColors.maroon;

  const pageBackground = isDarkMode
    ? "bg-[#141414] text-gray-100"
    : "bg-[#F8F9FA] text-gray-900";

  const cardBackground = isDarkMode
    ? "bg-[#1E1E1E] border-[#333333]"
    : "bg-white border-gray-200";

  const textMuted = isDarkMode
    ? "text-gray-400"
    : "text-gray-500";

  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === path;
    }

    return location.pathname === path ||
      location.pathname.startsWith(`${path}/`);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const sidebarContent = (
    <>
      {/* Logo and Branding */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center overflow-hidden">
            <img
              src="/oralogo.png"
              alt="ORA Logo"
              className="w-full h-full object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>

          <div>
            <h1 className="text-white font-bold text-lg">
              ORA
            </h1>
            <p className="text-white/60 text-[10px]">
              Super Admin Portal
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider px-3 mb-4">
          Main menu
        </p>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-white text-[#531324] shadow-sm"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-lg">
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Settings */}
        <div className="mt-8">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider px-3 mb-4">
            Preferences
          </p>

          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-white/75 hover:bg-white/10 text-[13px]"
          >
            <span className="flex items-center gap-3">
              <SafetyCertificateOutlined className="text-lg" />
              Settings
            </span>

            <span>
              {settingsOpen ? "−" : "+"}
            </span>
          </button>

          {settingsOpen && (
            <div className="ml-4 mt-2 space-y-3 px-4 py-3 bg-white/5 rounded-lg">
              <label className="flex items-center justify-between text-white/80 text-xs">
                Dark mode
                <input
                  type="checkbox"
                  checked={isDarkMode}
                  onChange={(event) =>
                    setIsDarkMode(event.target.checked)
                  }
                />
              </label>

              <label className="flex items-center justify-between text-white/80 text-xs">
                Top navigation
                <input
                  type="checkbox"
                  checked={isTopNav}
                  onChange={(event) =>
                    setIsTopNav(event.target.checked)
                  }
                />
              </label>

              <div>
                <p className="text-white/60 text-xs mb-2">
                  Sidebar theme
                </p>

                <select
                  value={sidebarTheme}
                  onChange={(event) =>
                    setSidebarTheme(event.target.value)
                  }
                  className="w-full bg-white text-gray-900 rounded-md px-2 py-2 text-xs"
                >
                  <option value="maroon">ORA Maroon</option>
                  <option value="dark">Dark</option>
                  <option value="navy">Navy</option>
                  <option value="green">Green</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
            <TeamOutlined />
          </div>

          <div className="min-w-0">
            <p className="text-white text-xs font-bold truncate">
              {fullName}
            </p>
            <p className="text-white/50 text-[10px] truncate">
              {user?.email || "System administrator"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/75 hover:bg-white/10 text-[13px]"
        >
          <ArrowRightOutlined />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className={`min-h-screen flex ${pageBackground}`}>

      {/* Desktop Sidebar */}
      {!isTopNav && (
        <aside
          className={`hidden lg:flex w-[260px] shrink-0 flex-col min-h-screen ${sidebarBackground}`}
        >
          {sidebarContent}
        </aside>
      )}

      {/* Mobile Sidebar */}
      {!isTopNav && mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <aside
            className={`w-[280px] flex flex-col min-h-screen ${sidebarBackground}`}
          >
            <div className="flex justify-end p-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="text-white text-xl px-3"
              >
                ×
              </button>
            </div>

            {sidebarContent}
          </aside>

          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex-1 bg-black/50"
          />
        </div>
      )}

      {/* Main Section */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Top Navigation */}
        <header
          className={`h-[70px] px-4 sm:px-6 flex items-center justify-between border-b ${
            isDarkMode
              ? "bg-[#1E1E1E] border-[#333333]"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {!isTopNav && (
              <button
                type="button"
                onClick={() =>
                  setMobileSidebarOpen(!mobileSidebarOpen)
                }
                className="lg:hidden text-xl"
              >
                ☰
              </button>
            )}

            <div>
              <p className="text-sm font-bold">
                ORA Digital Platform
              </p>

              <p className={`text-[10px] ${textMuted}`}>
                Identity & Access Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">

            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                isDarkMode
                  ? "bg-[#333333] text-yellow-300"
                  : "bg-gray-100 text-gray-600"
              }`}
              title="Toggle dark mode"
            >
              {isDarkMode ? "☀" : "☾"}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2"
              >
                <div className="w-9 h-9 rounded-full bg-ora-maroon text-white flex items-center justify-center">
                  <TeamOutlined />
                </div>

                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold">
                    {fullName}
                  </p>

                  <p className={`text-[10px] ${textMuted}`}>
                    Super Admin
                  </p>
                </div>

                <span className={textMuted}>⌄</span>
              </button>

              {profileOpen && (
                <div
                  className={`absolute right-0 top-12 z-40 w-48 rounded-lg border shadow-lg p-2 ${cardBackground}`}
                >
                  <div className="px-3 py-2">
                    <p className="text-xs font-bold">
                      {fullName}
                    </p>

                    <p className={`text-[10px] ${textMuted}`}>
                      Super Administrator
                    </p>
                  </div>

                  <div className="border-t my-1 border-gray-200" />

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/account");
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-xs hover:bg-gray-100 hover:text-gray-900"
                  >
                    My account
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-md text-xs hover:bg-gray-100 hover:text-gray-900"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Top Navigation Menu */}
        {isTopNav && (
          <nav
            className={`px-4 sm:px-6 py-3 border-b flex gap-2 overflow-x-auto ${
              isDarkMode
                ? "bg-[#1E1E1E] border-[#333333]"
                : "bg-white border-gray-200"
            }`}
          >
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs whitespace-nowrap ${
                  isActive(item.path)
                    ? "bg-ora-maroon text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>

        {/* Footer */}
        <footer
          className={`px-6 py-4 border-t text-center text-[11px] ${textMuted} ${
            isDarkMode
              ? "border-[#333333]"
              : "border-gray-200"
          }`}
        >
          © {new Date().getFullYear()} Oromo Research Association.
          All rights reserved.
        </footer>
      </div>
    </div>
  );
}
