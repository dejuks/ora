import React, { useState } from "react";

import { useAuth } from "../../../context/AuthContext";
import { changePassword, describeError } from "../services/authService";
import {
  FormAlert,
  PasswordField,
  SubmitButton,
  isPasswordValid,
} from "./AuthUi";

/**
 * Change-password form used by the forced first-login page and by the
 * account page. Other devices are signed out by the server; this one
 * receives a fresh access token.
 */
export default function ChangePasswordForm({ onSuccess }) {
  const { replaceToken } = useAuth();

  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setFormError("");
    setSuccess("");

    const found = {};
    if (!form.current) found.current = "Enter your current password.";
    if (!isPasswordValid(form.next))
      found.next = "Password does not meet all requirements.";
    if (form.next !== form.confirm)
      found.confirm = "Passwords do not match.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      setLoading(true);
      const response = await changePassword({
        currentPassword: form.current,
        newPassword: form.next,
      });
      await replaceToken(response.data.accessToken);
      setForm({ current: "", next: "", confirm: "" });
      setSuccess("Your password has been changed.");
      onSuccess?.();
    } catch (error) {
      const info = describeError(error, "Unable to change the password.");
      if (info.code === "INVALID_CURRENT_PASSWORD")
        setErrors({ current: info.message });
      else if (info.fields.new_password)
        setErrors({ next: info.fields.new_password });
      else setFormError(info.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <PasswordField
        id="current"
        label="Current (or temporary) password"
        autoComplete="current-password"
        value={form.current}
        onChange={update}
        error={errors.current}
        disabled={loading}
      />
      <PasswordField
        id="next"
        label="New password"
        autoComplete="new-password"
        value={form.next}
        onChange={update}
        error={errors.next}
        showRules
        disabled={loading}
      />
      <PasswordField
        id="confirm"
        label="Confirm new password"
        autoComplete="new-password"
        value={form.confirm}
        onChange={update}
        error={errors.confirm}
        disabled={loading}
      />
      <FormAlert>{formError}</FormAlert>
      <FormAlert type="success">{success}</FormAlert>
      <SubmitButton loading={loading} loadingText="Saving...">
        Change password
      </SubmitButton>
    </form>
  );
}
