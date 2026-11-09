import React, { useState } from "react";
import {
  CheckCircleFilled,
  CloseCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons";

/* ------------------------------------------------------------------ */
/* Password rules (must match the auth service / SRS UC-SYS-01)        */
/* ------------------------------------------------------------------ */

export const passwordChecks = (password = "") => [
  { label: "At least 8 characters", ok: password.length >= 8 },
  { label: "An uppercase letter", ok: /[A-Z]/.test(password) },
  { label: "A lowercase letter", ok: /[a-z]/.test(password) },
  { label: "A number", ok: /[0-9]/.test(password) },
  { label: "A special character", ok: /[^A-Za-z0-9]/.test(password) },
];

export const isPasswordValid = (password) =>
  passwordChecks(password).every((check) => check.ok);

export function PasswordRules({ password }) {
  if (!password) return null;

  return (
    <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
      {passwordChecks(password).map((check) => (
        <li
          key={check.label}
          className={`text-[11px] flex items-center gap-1.5 ${
            check.ok ? "text-green-600" : "text-gray-400"
          }`}
        >
          {check.ok ? <CheckCircleFilled /> : <CloseCircleOutlined />}
          {check.label}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Form pieces                                                         */
/* ------------------------------------------------------------------ */

const inputClass =
  "w-full px-4 py-3 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-[#7A1849]/20 focus:border-[#7A1849] outline-none transition-all text-[14px] disabled:opacity-60";

export function TextField({
  id,
  label,
  error,
  hint,
  className = "",
  ...inputProps
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-[12px] font-bold text-gray-700 mb-1.5"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        {...inputProps}
        className={`${inputClass} ${
          error ? "border-red-300" : "border-gray-200"
        }`}
      />
      {hint && !error && (
        <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
      )}
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export function PasswordField({
  id,
  label,
  error,
  showRules = false,
  labelAction,
  value,
  className = "",
  ...inputProps
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-1.5">
        <label
          htmlFor={id}
          className="block text-[12px] font-bold text-gray-700"
        >
          {label}
        </label>
        {labelAction}
      </div>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          {...inputProps}
          className={`${inputClass} pr-12 ${
            error ? "border-red-300" : "border-gray-200"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((previous) => !previous)}
          className="absolute right-4 top-3.5 text-gray-400 hover:text-[#7A1849]"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
        </button>
      </div>
      {showRules && <PasswordRules password={value} />}
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export function FormAlert({ type = "error", children }) {
  if (!children) return null;

  const styles = {
    error: "bg-red-50 border-red-200 text-red-700",
    success: "bg-green-50 border-green-200 text-green-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
  };

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`border text-[13px] rounded-xl p-3 ${styles[type]}`}
    >
      {children}
    </div>
  );
}

export function SubmitButton({ loading, loadingText, children, ...rest }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-[#7A1849] text-white py-3.5 rounded-xl font-bold hover:bg-[#5E1136] transition-all shadow-lg hover:shadow-xl flex justify-center items-center gap-2 text-[14px] disabled:opacity-60 disabled:cursor-not-allowed"
      {...rest}
    >
      {loading ? loadingText || "Please wait..." : children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Page shell shared by every public authentication page               */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: <TeamOutlined />,
    text: "One account for every ORA service",
  },
  {
    icon: <ReadOutlined />,
    text: "Journals, books, library and research in one place",
  },
  {
    icon: <SafetyCertificateOutlined />,
    text: "Secure sign-in with role-based access",
  },
];

export function AuthShell({ icon, title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex font-sans bg-white">
      {/* Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#531324] overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7A1849] via-[#531324] to-[#2D0A14]" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute top-20 left-20 w-72 h-72 bg-[#7A1849] rounded-full mix-blend-multiply filter blur-2xl opacity-50" />
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-[#C59B4B] rounded-full mix-blend-multiply filter blur-2xl opacity-20" />

        <div className="relative z-10 p-12 max-w-lg">
          <div className="bg-white p-3 rounded-2xl inline-block mb-8 shadow-xl">
            <img
              src="/oralogo.png"
              alt="Oromo Research Association"
              className="h-12 w-auto object-contain"
            />
          </div>

          <h1 className="text-3xl md:text-4xl font-serif font-bold text-white leading-[1.2] mb-6">
            ORA Digital Platform.
            <br />
            Secure access for everyone.
          </h1>

          <p className="text-[14px] text-[#E0C3D0] leading-relaxed mb-10">
            Centralized identity and access control for the ORA digital
            ecosystem: researchers, authors, editors and administrators
            sign in here.
          </p>

          <div className="space-y-4">
            {features.map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-3 text-[#E0C3D0]"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                  {item.icon}
                </div>
                <span className="text-[13px] font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative bg-[#F8F9FA]">
        <div className="w-full max-w-[520px]">
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src="/oralogo.png"
              alt="Oromo Research Association"
              className="h-12 w-auto"
            />
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100">
            <div className="mb-8 text-center">
              {icon && (
                <div className="w-12 h-12 rounded-xl bg-[#FCF7F9] text-[#7A1849] flex items-center justify-center mx-auto mb-4 text-xl">
                  {icon}
                </div>
              )}
              <h2 className="text-2xl font-serif font-bold text-gray-900 mb-1.5">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[13px] text-gray-500">{subtitle}</p>
              )}
            </div>

            {children}

            {footer && (
              <div className="text-center text-[13px] text-gray-500 mt-8">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
