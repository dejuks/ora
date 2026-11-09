
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import UMLayout from "../../../layouts/UMLayout";
import { useTheme } from "../../../context/ThemeContext";
import { createUser, getUserOptions } from "../services/userService";
import { getRoles } from "../../roles/services/roleService";
import { PasswordRules } from "../../authentication/components/AuthUi";
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  InfoCircleOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
} from "@ant-design/icons";

const modules = [
  { code: "JMS", label: "Journal Management System" },
  { code: "EBOOK", label: "eBook Publishing" },
  { code: "LMS", label: "Library Management System" },
  { code: "REPOSITORY", label: "Research Repository" },
  { code: "WIKI", label: "Oromo Wiki" },
  { code: "RNP", label: "Researchers Network Platform" },
];

export default function AddUser() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const [selectedModule, setSelectedModule] = useState("JMS");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    username: "",
    password: "",
    role_id: "",
    branch_id: "",
  });

  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Roles of the selected module.
  useEffect(() => {
    let active = true;
    setRoles([]);

    getRoles({ module_code: selectedModule, scope: "MODULE", limit: 100 })
      .then((response) => {
        if (active) {
          setRoles(
            (response.data.items || []).filter(
              (role) => role.is_active !== false
            )
          );
        }
      })
      .catch(() => {
        if (active) setFormError("Unable to load roles for this module.");
      });

    return () => {
      active = false;
    };
  }, [selectedModule]);

  // Library branches (only needed for LMS).
  useEffect(() => {
    getUserOptions()
      .then((response) => setBranches(response.data.branches || []))
      .catch(() => setBranches([]));
  }, []);

  const handleSubmit = async () => {
    if (submitting) return;

    setFormError("");
    setFieldErrors({});

    try {
      setSubmitting(true);
      await createUser({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        username: formData.username.trim(),
        password: formData.password,
        module_code: selectedModule,
        role_id: formData.role_id,
        branch_id:
          selectedModule === "LMS" ? formData.branch_id || null : null,
      });
      navigate("/users");
    } catch (error) {
      const data = error.response?.data;
      setFormError(
        data?.message || "Unable to create the user. Please try again."
      );
      if (data?.errors && !Array.isArray(data.errors)) {
        setFieldErrors(
          Object.fromEntries(
            Object.entries(data.errors).map(([key, value]) => [
              key,
              Array.isArray(value) ? value[0] : String(value),
            ])
          )
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const bgCard = isDarkMode
    ? "bg-[#1E1E1E] border-[#2D2D2D]"
    : "bg-white border-gray-200";

  const textMain = isDarkMode ? "text-gray-100" : "text-gray-900";
  const textMuted = isDarkMode ? "text-gray-400" : "text-gray-500";

  const inputBg = isDarkMode
    ? "bg-[#1A1A1A] border-[#3D3D3D] text-white focus:ring-[#7A1849]"
    : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:ring-[#7A1849]";

  const labelStyle = `block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 ${
    isDarkMode ? "text-gray-400" : ""
  }`;

  const sectionTitle = `text-[15px] font-bold mb-6 flex items-center gap-2 border-b pb-4 ${
    isDarkMode
      ? "border-gray-800 text-gray-100"
      : "border-gray-100 text-gray-900"
  }`;

  const numCircle =
    "w-6 h-6 rounded-full bg-[#FCF7F9] text-[#7A1849] flex items-center justify-center text-[10px] font-bold";

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const selectedModuleLabel =
    modules.find((module) => module.code === selectedModule)?.label || "";

  const initials =
    `${formData.first_name.charAt(0)}${formData.last_name.charAt(0)}`.toUpperCase() ||
    "U";

  return (
    <UMLayout>
      <div className="max-w-[1200px] mx-auto">

        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className={`text-[11px] font-bold tracking-widest uppercase mb-1.5 ${textMuted}`}>
              Workspace / Users / Add
            </p>

            <h1 className={`text-2xl font-serif font-bold ${textMain}`}>
              Create New User
            </h1>

            <p className={`text-[13px] mt-1 ${textMuted}`}>
              Add a user and grant access to an ORA platform module.
            </p>
          </div>

          <Link
            to="/users"
            className={`px-4 py-2 rounded-lg text-[12px] font-bold border transition-all flex items-center gap-2 ${
              isDarkMode
                ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                : "border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
            }`}
          >
            <ArrowLeftOutlined />
            Back
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Left Form Area */}
          <div className="flex-1 space-y-6">

            {/* Section 1: Personal Information */}
            <div className={`p-6 rounded-2xl border shadow-sm ${bgCard}`}>
              <h2 className={sectionTitle}>
                <span className={numCircle}>
                  <UserOutlined />
                </span>
                Personal Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>
                    First Name <span className="text-red-500">*</span>
                  </label>

                  <input
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    type="text"
                    required
                    placeholder="Enter first name"
                    className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 text-[13px] ${inputBg}`}
                  />
                </div>

                <div>
                  <label className={labelStyle}>
                    Last Name <span className="text-red-500">*</span>
                  </label>

                  <input
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    type="text"
                    required
                    placeholder="Enter last name"
                    className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 text-[13px] ${inputBg}`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelStyle}>
                    Email Address <span className="text-red-500">*</span>
                  </label>

                  <input
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    type="email"
                    required
                    placeholder="user@ora.org"
                    className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 text-[13px] ${inputBg}`}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Access Assignment */}
            <div className={`p-6 rounded-2xl border shadow-sm ${bgCard}`}>
              <h2 className={sectionTitle}>
                <span className={numCircle}>
                  <SafetyCertificateOutlined />
                </span>
                Access Assignment
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>
                    Assign Module <span className="text-red-500">*</span>
                  </label>

                  <select
                    value={selectedModule}
                    onChange={(e) => {
                      setSelectedModule(e.target.value);
                      setFormData((previous) => ({
                        ...previous,
                        role_id: "",
                        branch_id: "",
                      }));
                    }}
                    className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 text-[13px] ${inputBg}`}
                  >
                    {modules.map((module) => (
                      <option key={module.code} value={module.code}>
                        {module.label}
                      </option>
                    ))}
                  </select>

                  <p className={`text-[10px] mt-1.5 ${textMuted}`}>
                    Select the primary system this user will access.
                  </p>
                </div>

                <div>
                  <label className={labelStyle}>
                    Assign Role <span className="text-red-500">*</span>
                  </label>

                  <select
                    name="role_id"
                    value={formData.role_id}
                    onChange={handleChange}
                    required
                    className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 text-[13px] ${inputBg}`}
                  >
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>

                  <p className={`text-[10px] mt-1.5 ${textMuted}`}>
                    Roles available in the selected module.
                  </p>
                </div>

                {selectedModule === "LMS" && (
                  <div className="md:col-span-2 p-4 rounded-xl border border-dashed border-gray-400 mt-2">
                    <label className={labelStyle}>
                      Assign Library Branch{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <select
                      name="branch_id"
                      value={formData.branch_id}
                      onChange={handleChange}
                      required
                      className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 text-[13px] ${inputBg}`}
                    >
                      <option value="">Select a branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>

                    <p className={`text-[10px] mt-1.5 flex items-center gap-1 ${textMuted}`}>
                      <InfoCircleOutlined />
                      LMS users must be assigned to a valid library branch.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Account Credentials */}
            <div className={`p-6 rounded-2xl border shadow-sm ${bgCard}`}>
              <h2 className={sectionTitle}>
                <span className={numCircle}>
                  <LockOutlined />
                </span>
                Account Credentials
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>
                    Username <span className="text-red-500">*</span>
                  </label>

                  <input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    type="text"
                    required
                    placeholder="username"
                    className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 text-[13px] ${inputBg}`}
                  />
                </div>

                <div>
                  <label className={labelStyle}>
                    Password <span className="text-red-500">*</span>
                  </label>

                  <input
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    type="password"
                    required
                    minLength={8}
                    placeholder="Temporary password (min. 8 characters)"
                    className={`w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 text-[13px] ${inputBg}`}
                  />
                  <PasswordRules password={formData.password} />
                  {fieldErrors.password && (
                    <p className="text-[11px] text-red-600 mt-1">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
              </div>

              <div className={`p-3 rounded-lg border flex items-center gap-2 mt-4 ${
                isDarkMode
                  ? "bg-blue-900/10 border-blue-900/30"
                  : "bg-blue-50 border-blue-200"
              }`}>
                <InfoCircleOutlined className="text-blue-500" />

                <p className={`text-[11px] font-medium ${
                  isDarkMode ? "text-blue-300" : "text-blue-800"
                }`}>
                  The account is active immediately. The user signs in with this
                  temporary password and is asked to choose their own first.
                  Share it through a secure channel.
                </p>
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-xl p-3"
              >
                {formError}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/users")}
                className={`px-5 py-2 rounded-lg text-[12px] font-bold border transition-colors ${
                  isDarkMode
                    ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-[#7A1849] text-white px-6 py-2 rounded-lg text-[12px] font-bold hover:bg-[#5E1136] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>

          {/* Right Sidebar: Live Preview */}
          <div className="w-full lg:w-[300px]">
            <div className={`p-5 rounded-2xl border shadow-sm sticky top-24 ${bgCard}`}>
              <h3 className={`text-[11px] font-bold uppercase tracking-wider mb-4 ${textMuted}`}>
                User Preview
              </h3>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-full bg-[#FCF7F9] text-[#7A1849] flex items-center justify-center font-bold text-sm border border-[#7A1849]/20">
                  {initials || "U"}
                </div>

                <div className="min-w-0">
                  <h4 className={`text-[14px] font-bold ${textMain}`}>
                    {formData.first_name || "First"}{" "}
                    {formData.last_name || "Last"}
                  </h4>

                  <p className={`text-[11px] truncate ${textMuted}`}>
                    {formData.email || "user@ora.org"}
                  </p>
                </div>
              </div>

              <div className={`space-y-3 text-[12px] pt-4 border-t ${
                isDarkMode ? "border-gray-800" : "border-gray-100"
              }`}>
                <div className="flex justify-between gap-3">
                  <span className={textMuted}>Module</span>
                  <span className="font-bold text-[#7A1849] text-right">
                    {selectedModule}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className={textMuted}>Role</span>
                  <span className="font-bold text-[#7A1849]">
                    Not selected
                  </span>
                </div>

                {selectedModule === "LMS" && (
                  <div className="flex justify-between">
                    <span className={textMuted}>Branch</span>
                    <span className="font-medium">Not selected</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className={textMuted}>Status</span>
                  <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-[10px]">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </UMLayout>
  );
}
