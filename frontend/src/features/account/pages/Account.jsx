import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import UMLayout from "../../../layouts/UMLayout";
import ChangePasswordForm from "../../authentication/components/ChangePasswordForm";
import {
  FormAlert,
  SubmitButton,
  TextField,
} from "../../authentication/components/AuthUi";
import {
  describeError,
  updateMe,
} from "../../authentication/services/authService";

function Section({ title, description, children }) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
      {description && (
        <p className="text-[12px] text-gray-500 mt-1 mb-5">{description}</p>
      )}
      {!description && <div className="mb-5" />}
      {children}
    </section>
  );
}

function ProfileForm() {
  const { user, setUser } = useAuth();

  const [form, setForm] = useState({
    first_name: user.firstName,
    last_name: user.lastName,
    job_title: user.profile?.jobTitle || "",
    organization: user.profile?.organization || "",
    bio: user.profile?.bio || "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setFormError("");
    setSuccess("");

    try {
      setLoading(true);
      const response = await updateMe({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        job_title: form.job_title.trim() || null,
        organization: form.organization.trim() || null,
        bio: form.bio.trim() || null,
      });
      setUser(response.data.user);
      setErrors({});
      setSuccess("Profile saved.");
    } catch (error) {
      const info = describeError(error, "Unable to save your profile.");
      setErrors(info.fields);
      if (!Object.keys(info.fields).length) setFormError(info.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          id="first_name"
          label="First name"
          value={form.first_name}
          onChange={update}
          error={errors.first_name}
          disabled={loading}
        />
        <TextField
          id="last_name"
          label="Last name"
          value={form.last_name}
          onChange={update}
          error={errors.last_name}
          disabled={loading}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          id="job_title"
          label="Job title"
          value={form.job_title}
          onChange={update}
          error={errors.job_title}
          disabled={loading}
        />
        <TextField
          id="organization"
          label="Organization"
          value={form.organization}
          onChange={update}
          error={errors.organization}
          disabled={loading}
        />
      </div>
      <div>
        <label
          htmlFor="bio"
          className="block text-[12px] font-bold text-gray-700 mb-1.5"
        >
          Short bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          value={form.bio}
          onChange={update}
          disabled={loading}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#7A1849]/20 focus:border-[#7A1849] outline-none text-[14px]"
        />
      </div>
      <FormAlert>{formError}</FormAlert>
      <FormAlert type="success">{success}</FormAlert>
      <div className="max-w-[200px]">
        <SubmitButton loading={loading} loadingText="Saving...">
          Save profile
        </SubmitButton>
      </div>
    </form>
  );
}

function AccountContent() {
  const { user } = useAuth();

  return (
    <div className="max-w-[820px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-gray-900">
          My account
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">
          {user.firstName} {user.lastName} · @{user.username} · {user.email}
        </p>
      </div>

      <Section
        title="Access"
        description="The ORA services you can use and your role in each."
      >
        {user.systemRoles.length === 0 && user.modules.length === 0 ? (
          <p className="text-[13px] text-gray-500">
            No module access has been assigned yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {user.systemRoles.map((role) => (
              <li key={role.code} className="text-[13px]">
                <strong>System:</strong> {role.name}
              </li>
            ))}
            {user.modules.map((module) => (
              <li key={module.code} className="text-[13px]">
                <strong>{module.name}:</strong>{" "}
                {module.roles.map((role) => role.name).join(", ") ||
                  "No role"}
                {module.libraryBranch ? ` (${module.libraryBranch})` : ""}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Profile">
        <ProfileForm />
      </Section>

      <Section
        title="Password"
        description="Changing your password signs you out on all other devices."
      >
        <div className="max-w-[420px]">
          <ChangePasswordForm />
        </div>
      </Section>
    </div>
  );
}

/** Super admins get the admin shell; everyone else a light header. */
export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (user.isSuperAdmin) {
    return (
      <UMLayout>
        <div className="p-6">
          <AccountContent />
        </div>
      </UMLayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans">
      <header className="bg-[#531324] text-white">
        <div className="max-w-[1100px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg p-1.5">
              <img
                src="/oralogo.png"
                alt="ORA"
                className="h-7 w-auto"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
            <span className="font-bold">ORA Digital Platform</span>
          </div>

          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
            className="text-[13px] px-3 py-1.5 rounded-lg hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="p-4 sm:p-8">
        <AccountContent />
      </main>
    </div>
  );
}
