
import React from "react";
import UMLayout from "../layouts/UMLayout";
import { useTheme } from "../context/ThemeContext";

import {
  ArrowRightOutlined,
  UserAddOutlined,
  SafetyCertificateOutlined,
  BankOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";

export default function Dashboard() {
  const { isDarkMode } = useTheme();

  const bgCard = isDarkMode
    ? "bg-[#1E1E1E] border-[#2D2D2D]"
    : "bg-white border-gray-200";

  const textMain = isDarkMode ? "text-gray-100" : "text-gray-900";
  const textMuted = isDarkMode ? "text-gray-400" : "text-gray-500";
  const borderCol = isDarkMode ? "border-[#2D2D2D]" : "border-gray-200";

  const statistics = [
    {
      label: "Active Admins",
      value: "8",
      sub: "2 organization • 6 module admins",
    },
    {
      label: "Modules",
      value: "6",
      sub: "All enabled • UM is a core service",
    },
    {
      label: "Branches",
      value: "4",
      sub: "78 library staff across all branches",
    },
  ];

  const activities = [
    {
      title: "Maya Patel joined the workspace",
      desc: "LMS · Central Library · Invitation accepted",
      time: "10 min ago",
      icon: <UserAddOutlined />,
      color: "text-blue-500 bg-blue-50",
    },
    {
      title: "Library staff role updated",
      desc: "Sofia Chen · 8 permissions enabled",
      time: "38 min ago",
      icon: <SafetyCertificateOutlined />,
      color: "text-purple-500 bg-purple-50",
    },
    {
      title: "Daniel Kim assigned as branch admin",
      desc: "Riverside Library · LMS",
      time: "1 hour ago",
      icon: <BankOutlined />,
      color: "text-green-500 bg-green-50",
    },
    {
      title: "Oliver Reed's access suspended",
      desc: "JMS · Updated by Alex Morgan",
      time: "2 hours ago",
      icon: <CheckCircleFilled />,
      color: "text-red-500 bg-red-50",
    },
  ];

  const modules = [
    { name: "JMS", users: "32", admin: "Lucas Bennett" },
    { name: "eBook", users: "48", admin: "Isabella Garcia" },
    { name: "LMS", users: "76", admin: "Sofia Chen" },
    { name: "Repository", users: "38", admin: "Amara Okafor" },
    { name: "Wiki", users: "24", admin: "Ethan Brooks" },
    { name: "RNP", users: "18", admin: "Priya Shah" },
  ];

  const quickActions = [
    {
      label: "Create User",
      desc: "Add a person to your workspace",
      icon: <UserAddOutlined />,
    },
    {
      label: "Create Role",
      desc: "Define access for your team",
      icon: <SafetyCertificateOutlined />,
    },
    {
      label: "Add Branch",
      desc: "Expand your library network",
      icon: <BankOutlined />,
    },
  ];

  const branches = [
    { name: "Central Library", staff: "28 staff" },
    { name: "Riverside Library", staff: "20 staff" },
    { name: "North Campus Library", staff: "16 staff" },
    { name: "West End Library", staff: "12 staff" },
  ];

  return (
    <UMLayout>
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${textMain}`}>
              Identity & access overview
            </h1>

            <p className={`text-[13px] mt-1 ${textMuted}`}>
              One identity layer for six ORA services and your physical library network.
            </p>
          </div>

          <button
            type="button"
            className="bg-ora-maroon text-white px-4 py-2 rounded-lg text-[12px] font-bold hover:bg-ora-plum transition-colors flex items-center gap-2"
          >
            View reports <ArrowRightOutlined />
          </button>
        </div>

        {/* Top Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">

          <div className="bg-ora-maroon text-white p-6 rounded-xl shadow-md">
            <p className="text-[12px] font-bold text-white/80 mb-2">
              Total Users
            </p>

            <h3 className="text-4xl font-bold mb-2">248</h3>

            <p className="text-[11px] font-medium text-white/80">
              135 active • 8 invited • 4 suspended
            </p>
          </div>

          {statistics.map((stat, index) => (
            <div
              key={index}
              className={`p-6 rounded-xl border shadow-sm ${bgCard}`}
            >
              <p className={`text-[12px] font-bold mb-2 ${textMuted}`}>
                {stat.label}
              </p>

              <h3 className={`text-4xl font-bold mb-2 ${textMain}`}>
                {stat.value}
              </h3>

              <p className={`text-[11px] font-medium ${textMuted}`}>
                {stat.sub}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Recent Activity */}
            <div className={`p-6 rounded-xl border shadow-sm ${bgCard}`}>
              <h2 className={`text-[16px] font-bold mb-1 ${textMain}`}>
                Recent activity
              </h2>

              <p className={`text-[12px] mb-6 ${textMuted}`}>
                The latest changes across your workspace.
              </p>

              <div className="space-y-4">
                {activities.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2"
                  >
                    <div className="flex gap-3">
                      <div
                        className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${item.color}`}
                      >
                        {item.icon}
                      </div>

                      <div>
                        <p className={`text-[13px] font-bold ${textMain}`}>
                          {item.title}
                        </p>

                        <p className={`text-[11px] ${textMuted}`}>
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] ${textMuted}`}>
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="text-ora-maroon text-[12px] font-bold mt-6 hover:underline"
              >
                View all activity →
              </button>
            </div>

            {/* Six Services */}
            <div className={`p-6 rounded-xl border shadow-sm ${bgCard}`}>
              <h2 className={`text-[16px] font-bold mb-1 ${textMain}`}>
                Six services. One access layer.
              </h2>

              <p className={`text-[12px] mb-6 ${textMuted}`}>
                Module administrators and assigned users across ORA.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {modules.map((mod, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      isDarkMode
                        ? "bg-[#2A2A2A] border-[#3D3D3D]"
                        : "bg-gray-50 border-gray-100"
                    }`}
                  >
                    <h3 className={`text-[14px] font-bold mb-1 ${textMain}`}>
                      {mod.name}
                    </h3>

                    <p className={`text-[11px] mb-3 ${textMuted}`}>
                      {mod.users} assigned users
                    </p>

                    <p className={`text-[11px] font-medium ${textMain}`}>
                      {mod.admin}
                    </p>

                    <p className="text-[10px] text-green-600 font-bold mt-1">
                      Enabled
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {/* Quick Actions */}
            <div className={`p-6 rounded-xl border shadow-sm ${bgCard}`}>
              <h2 className={`text-[16px] font-bold mb-1 ${textMain}`}>
                Quick actions
              </h2>

              <p className={`text-[12px] mb-6 ${textMuted}`}>
                Common tasks, one step away.
              </p>

              <div className="space-y-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`w-full flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2A2A2A] transition-colors border ${borderCol}`}
                  >
                    <div className="flex gap-3 items-center text-left">
                      <span className="text-ora-maroon text-lg">
                        {action.icon}
                      </span>

                      <div>
                        <p className={`text-[13px] font-bold ${textMain}`}>
                          {action.label}
                        </p>

                        <p className={`text-[11px] ${textMuted}`}>
                          {action.desc}
                        </p>
                      </div>
                    </div>

                    <ArrowRightOutlined
                      className={`text-[10px] ${textMuted}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Access Review */}
            <div className={`p-6 rounded-xl border shadow-sm ${bgCard}`}>
              <div className="flex justify-between items-center mb-2">
                <h2 className={`text-[16px] font-bold ${textMain}`}>
                  Access review
                </h2>

                <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Up to date
                </span>
              </div>

              <p className={`text-[12px] ${textMuted}`}>
                All 12 roles reviewed. The next scheduled access review is{" "}
                <span className={`font-bold ${textMain}`}>
                  1 November 2026
                </span>.
              </p>
            </div>

            {/* Physical Network */}
            <div className={`p-6 rounded-xl border shadow-sm ${bgCard}`}>
              <h2 className={`text-[16px] font-bold mb-1 ${textMain}`}>
                Physical-library network
              </h2>

              <p className={`text-[12px] mb-6 ${textMuted}`}>
                LMS • 4 active branches / 76 staff
              </p>

              <div className="space-y-3">
                {branches.map((branch, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                  >
                    <p className={`text-[12px] font-medium ${textMain}`}>
                      {branch.name}
                    </p>

                    <p className="text-[11px] font-bold text-ora-maroon">
                      {branch.staff}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </UMLayout>
  );
}
