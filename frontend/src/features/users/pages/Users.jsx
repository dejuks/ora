import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import {
  DownOutlined,
  EllipsisOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";

import UMLayout from "../../../layouts/UMLayout";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import {
  getUserStats,
  listUsers,
  updateUserStatus,
} from "../services/userService";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 10;

const TABS = [
  { key: "all", label: "All users", role: "", status: "" },
  { key: "editors", label: "Editors", role: "EDITOR", status: "" },
  { key: "reviewers", label: "Reviewers", role: "REVIEWER", status: "" },
  { key: "authors", label: "Authors", role: "AUTHOR", status: "" },
  { key: "pending", label: "Pending", role: "", status: "PENDING" },
];

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "EDITOR", label: "Editor" },
  { value: "REVIEWER", label: "Reviewer" },
  { value: "AUTHOR", label: "Author" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending" },
  { value: "SUSPENDED", label: "Suspended" },
];

const AVATAR_COLORS = [
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
];

const STATUS_STYLES = {
  ACTIVE: "bg-green-50 text-green-700",
  PENDING: "bg-amber-50 text-amber-700",
  SUSPENDED: "bg-red-50 text-red-700",
  DISABLED: "bg-gray-100 text-gray-600",
};

const initials = (user) =>
  `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

const avatarColor = (id = "") => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 997;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "—";

/** "12 min ago", "1 hour ago", "Yesterday", "3 days ago", or a date. */
function relativeTime(value) {
  if (!value) return "Never";

  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;

  return formatDate(value);
}

/** Role text for the table: first role plus a "+N" counter. */
function roleLabel(user) {
  const names = [
    ...user.systemRoles.map((role) => role.name),
    ...user.modules.flatMap((module) => module.roles.map((r) => r.name)),
  ];

  if (names.length === 0) return "—";
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1}`;
}

const roleTitle = (user) =>
  [
    ...user.systemRoles.map((role) => role.name),
    ...user.modules.flatMap((module) =>
      module.roles.map((role) => `${module.code}: ${role.name}`)
    ),
  ].join("\n");

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (ref.current && !ref.current.contains(event.target)) handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, dark }) {
  return (
    <div
      className={`rounded-2xl border px-7 py-6 ${
        dark ? "bg-[#1E1E1E] border-[#333]" : "bg-white border-gray-200"
      }`}
    >
      <p
        className={`text-[13px] font-semibold ${
          dark ? "text-gray-400" : "text-gray-600"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-4 text-[40px] leading-none font-extrabold tracking-tight ${
          dark ? "text-gray-100" : "text-gray-900"
        }`}
      >
        {value === null ? "—" : value.toLocaleString()}
      </p>
    </div>
  );
}

function RowMenu({ user, isSelf, onStatus, dark }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  // The table scrolls horizontally, which would clip an absolutely
  // positioned menu on the last rows, so the menu is placed on screen.
  const toggle = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuHeight = 130;
    const openUp = window.innerHeight - rect.bottom < menuHeight;
    setPosition({
      top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setOpen((previous) => !previous);
  };

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const item = `w-full text-left px-3 py-2 text-[12px] rounded-md ${
    dark ? "hover:bg-[#333]" : "hover:bg-gray-100"
  }`;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        aria-label="More actions"
        onClick={toggle}
        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          dark ? "hover:bg-[#333] text-gray-300" : "hover:bg-gray-100 text-gray-500"
        }`}
      >
        <EllipsisOutlined />
      </button>

      {open && (
        <div
          style={{ position: "fixed", top: position.top, right: position.right }}
          className={`z-50 w-44 rounded-xl border p-1 shadow-lg ${
            dark
              ? "bg-[#1E1E1E] border-[#333] text-gray-200"
              : "bg-white border-gray-200 text-gray-700"
          }`}
        >
          <button
            type="button"
            className={item}
            onClick={() => {
              navigator.clipboard?.writeText(user.email);
              message.success("Email copied.");
              setOpen(false);
            }}
          >
            Copy email
          </button>

          {!isSelf && user.status === "ACTIVE" && (
            <button
              type="button"
              className={`${item} text-red-600`}
              onClick={() => {
                setOpen(false);
                onStatus(user, "SUSPENDED");
              }}
            >
              Suspend user
            </button>
          )}

          {!isSelf && user.status === "SUSPENDED" && (
            <button
              type="button"
              className={item}
              onClick={() => {
                setOpen(false);
                onStatus(user, "ACTIVE");
              }}
            >
              Re-activate user
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EditStatusModal({ user, onClose, onSave, dark }) {
  const [status, setStatus] = useState(user.status);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave(user, status);
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-[420px] rounded-2xl p-6 shadow-xl ${
          dark ? "bg-[#1E1E1E] text-gray-100" : "bg-white text-gray-900"
        }`}
      >
        <h3 className="text-[17px] font-bold">Account status</h3>
        <p className={`text-[13px] mt-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>
          {user.firstName} {user.lastName} · {user.email}
        </p>

        <div className="mt-5 space-y-2">
          {["ACTIVE", "SUSPENDED"].map((value) => (
            <label
              key={value}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-[13px] cursor-pointer ${
                status === value
                  ? "border-[#7A1849] bg-[#FCF7F9] text-gray-900"
                  : dark
                  ? "border-[#333]"
                  : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="status"
                checked={status === value}
                onChange={() => setStatus(value)}
                className="accent-[#7A1849]"
              />
              <span className="font-semibold">
                {value === "ACTIVE" ? "Active" : "Suspended"}
              </span>
              <span className="text-gray-500 text-[12px]">
                {value === "ACTIVE"
                  ? "Can sign in"
                  : "Signed out and blocked"}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold border ${
              dark ? "border-[#333]" : "border-gray-200"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || status === user.status}
            onClick={save}
            className="px-5 py-2 rounded-xl text-[13px] font-bold text-white bg-[#7A1849] hover:bg-[#5E1136] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Users() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { isDarkMode: dark } = useTheme();

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);
  useClickOutside(filterRef, () => setFilterOpen(false));

  const [editing, setEditing] = useState(null);

  // Wait for the admin to stop typing before querying.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await getUserStats();
      setStats(response.data);
    } catch {
      setStats(null);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const response = await listUsers({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        role_code: roleFilter || undefined,
      });
      setUsers(response.data.items);
      setTotal(response.data.pagination.total);
    } catch (error) {
      setLoadError(
        error.response?.data?.message || "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const activeTab = useMemo(
    () =>
      TABS.find(
        (tab) => tab.role === roleFilter && tab.status === statusFilter
      )?.key,
    [roleFilter, statusFilter]
  );

  const selectTab = (tab) => {
    setRoleFilter(tab.role);
    setStatusFilter(tab.status);
    setPage(1);
  };

  const changeStatus = async (record, nextStatus) => {
    try {
      await updateUserStatus(record.id, nextStatus);
      message.success(
        nextStatus === "SUSPENDED"
          ? "User suspended and signed out."
          : "User re-activated."
      );
      setEditing(null);
      fetchUsers();
      fetchStats();
    } catch (error) {
      message.error(
        error.response?.data?.message || "Unable to update the user."
      );
    }
  };

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  const surface = dark
    ? "bg-[#1E1E1E] border-[#333]"
    : "bg-white border-gray-200";
  const textMain = dark ? "text-gray-100" : "text-gray-900";
  const textMuted = dark ? "text-gray-400" : "text-gray-500";
  const rowLine = dark ? "border-[#2A2A2A]" : "border-gray-100";
  const field = dark
    ? "bg-[#141414] border-[#333] text-gray-100 placeholder-gray-500"
    : "bg-white border-gray-200 text-gray-900 placeholder-gray-400";

  return (
    <UMLayout>
      <div className="p-6 sm:p-8">
        {/* Heading */}
        <p
          className={`text-[11px] font-bold tracking-[0.18em] uppercase ${textMuted}`}
        >
          Workspace / Administration
        </p>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={`text-[34px] leading-tight font-extrabold ${textMain}`}>
              Users
            </h1>
            <p className={`mt-3 text-[14px] ${textMuted}`}>
              Manage access, roles, invitations, and account status across the
              platform.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled
              title="Bulk import is not available yet"
              className={`px-5 py-3 rounded-xl border text-[13px] font-bold opacity-60 cursor-not-allowed flex items-center gap-2 ${surface} ${textMain}`}
            >
              <UploadOutlined /> Import users
            </button>
            <button
              type="button"
              onClick={() => navigate("/users/create")}
              className="px-5 py-3 rounded-xl text-[13px] font-bold text-white bg-[#7A1849] hover:bg-[#5E1136] shadow-sm flex items-center gap-2"
            >
              <PlusOutlined /> Add User
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard label="Total users" value={stats ? stats.total : null} dark={dark} />
          <StatCard label="Editors" value={stats ? stats.editors : null} dark={dark} />
          <StatCard label="Reviewers" value={stats ? stats.reviewers : null} dark={dark} />
          <StatCard label="Pending Invites" value={stats ? stats.pending : null} dark={dark} />
        </div>

        {/* Table card */}
        <div className={`mt-8 rounded-2xl border ${surface}`}>
          {/* Toolbar */}
          <div className="p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => selectTab(tab)}
                  className={`px-5 py-2.5 rounded-xl text-[13px] font-bold border transition-colors ${
                    activeTab === tab.key
                      ? "bg-[#7A1849] border-[#7A1849] text-white"
                      : dark
                      ? "border-[#333] text-gray-300 hover:bg-[#2A2A2A]"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <SearchOutlined
                  className={`absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or email..."
                  className={`w-[260px] pl-11 pr-4 py-3 rounded-xl border text-[13px] outline-none focus:ring-2 focus:ring-[#7A1849]/20 focus:border-[#7A1849] ${field}`}
                />
              </div>

              <div className="relative" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setFilterOpen((previous) => !previous)}
                  className="px-5 py-3 rounded-xl text-[13px] font-bold text-white bg-[#7A1849] hover:bg-[#5E1136] flex items-center gap-2"
                >
                  Role &amp; status <DownOutlined className="text-[10px]" />
                </button>

                {filterOpen && (
                  <div
                    className={`absolute right-0 z-20 mt-2 w-64 rounded-xl border p-4 shadow-lg space-y-4 ${surface}`}
                  >
                    <div>
                      <label className={`block text-[11px] font-bold mb-1.5 ${textMuted}`}>
                        Role
                      </label>
                      <select
                        value={roleFilter}
                        onChange={(event) => {
                          setRoleFilter(event.target.value);
                          setPage(1);
                        }}
                        className={`w-full px-3 py-2 rounded-lg border text-[13px] ${field}`}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold mb-1.5 ${textMuted}`}>
                        Status
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(event) => {
                          setStatusFilter(event.target.value);
                          setPage(1);
                        }}
                        className={`w-full px-3 py-2 rounded-lg border text-[13px] ${field}`}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRoleFilter("");
                        setStatusFilter("");
                        setPage(1);
                        setFilterOpen(false);
                      }}
                      className="text-[12px] font-bold text-[#7A1849] hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="bg-[#72214D] text-white">
                  {["User", "Role", "Status", "Joined", "Last activity", "Actions"].map(
                    (heading, index) => (
                      <th
                        key={heading}
                        className={`px-8 py-5 text-[11px] font-bold tracking-[0.15em] uppercase ${
                          index === 5 ? "text-right" : ""
                        }`}
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {loading && users.length === 0 && (
                  <tr>
                    <td colSpan={6} className={`px-8 py-12 text-center text-[13px] ${textMuted}`}>
                      Loading users...
                    </td>
                  </tr>
                )}

                {loadError && (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-[13px] text-red-600">
                      {loadError}{" "}
                      <button
                        type="button"
                        onClick={fetchUsers}
                        className="font-bold underline"
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                )}

                {!loading && !loadError && users.length === 0 && (
                  <tr>
                    <td colSpan={6} className={`px-8 py-12 text-center text-[13px] ${textMuted}`}>
                      No users match these filters.
                    </td>
                  </tr>
                )}

                {users.map((user) => {
                  const isSelf = user.id === currentUser?.id;

                  return (
                    <tr
                      key={user.id}
                      className={`border-b last:border-b-0 ${rowLine} ${
                        loading ? "opacity-60" : ""
                      }`}
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[13px] font-bold ${avatarColor(
                              user.id
                            )}`}
                          >
                            {initials(user)}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-[14px] font-bold truncate ${textMain}`}>
                              {user.firstName} {user.lastName}
                              {isSelf && (
                                <span className={`ml-2 text-[11px] font-semibold ${textMuted}`}>
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className={`text-[13px] truncate ${textMuted}`}>
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td
                        className={`px-8 py-5 text-[14px] whitespace-pre ${textMain}`}
                        title={roleTitle(user)}
                      >
                        {roleLabel(user)}
                      </td>

                      <td className="px-8 py-5">
                        <span
                          className={`inline-block px-3 py-1.5 rounded-lg text-[11px] font-extrabold tracking-wider ${
                            STATUS_STYLES[user.status] || STATUS_STYLES.DISABLED
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>

                      <td className={`px-8 py-5 text-[14px] ${textMain}`}>
                        {formatDate(user.createdAt)}
                      </td>

                      <td className={`px-8 py-5 text-[14px] ${textMain}`}>
                        {relativeTime(user.lastLoginAt)}
                      </td>

                      <td className="px-8 py-5">
                        <div className="flex items-center justify-end gap-2">
                          {!isSelf &&
                            (user.status === "ACTIVE" ||
                              user.status === "SUSPENDED") && (
                              <button
                                type="button"
                                onClick={() => setEditing(user)}
                                className="text-[13px] font-bold text-[#7A1849] hover:underline px-2"
                              >
                                Edit
                              </button>
                            )}
                          <RowMenu
                            user={user}
                            isSelf={isSelf}
                            onStatus={changeStatus}
                            dark={dark}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            className={`px-8 py-4 flex flex-wrap items-center justify-between gap-3 border-t ${rowLine}`}
          >
            <p className={`text-[13px] ${textMuted}`}>
              Showing {from}-{to} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((previous) => previous - 1)}
                className={`px-4 py-2 rounded-lg border text-[13px] font-semibold disabled:opacity-40 ${
                  dark ? "border-[#333]" : "border-gray-200"
                } ${textMain}`}
              >
                Previous
              </button>
              <span className={`text-[13px] px-2 ${textMuted}`}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((previous) => previous + 1)}
                className={`px-4 py-2 rounded-lg border text-[13px] font-semibold disabled:opacity-40 ${
                  dark ? "border-[#333]" : "border-gray-200"
                } ${textMain}`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <EditStatusModal
          user={editing}
          dark={dark}
          onClose={() => setEditing(null)}
          onSave={changeStatus}
        />
      )}
    </UMLayout>
  );
}
