import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LockOutlined } from "@ant-design/icons";

import { describeError, resetPassword } from "../services/authService";
import {
  AuthShell,
  FormAlert,
  PasswordField,
  SubmitButton,
  isPasswordValid,
} from "../components/AuthUi";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const next = {};
    if (!isPasswordValid(password))
      next.password = "Password does not meet all requirements.";
    if (password !== confirm) next.confirm = "Passwords do not match.";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length > 0) return;

    try {
      setLoading(true);
      await resetPassword({ token, password });
      setDone(true);
    } catch (error) {
      const info = describeError(error, "Unable to reset the password.");
      if (info.fields.password) setErrors({ password: info.fields.password });
      else setFormError(info.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Invalid reset link">
        <div className="space-y-4 text-center">
          <FormAlert>This password reset link is incomplete.</FormAlert>
          <Link
            to="/forgot-password"
            className="font-bold text-[#7A1849] hover:underline text-[13px]"
          >
            Request a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password updated">
        <div className="space-y-5 text-center">
          <FormAlert type="success">
            Your password has been reset. All devices were signed out.
          </FormAlert>
          <Link
            to="/login"
            className="inline-block w-full bg-[#7A1849] text-white py-3.5 rounded-xl font-bold hover:bg-[#5E1136] text-[14px]"
          >
            Sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon={<LockOutlined />}
      title="Choose a new password"
      subtitle="Use a strong password you don't use anywhere else."
      footer={
        <Link
          to="/login"
          className="font-bold text-[#7A1849] hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <PasswordField
          id="password"
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          showRules
          disabled={loading}
        />
        <PasswordField
          id="confirm"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          disabled={loading}
        />
        <FormAlert>
          {formError}
          {formError && (
            <>
              {" "}
              <Link to="/forgot-password" className="font-bold underline">
                Request a new link
              </Link>
            </>
          )}
        </FormAlert>
        <SubmitButton loading={loading} loadingText="Saving...">
          Reset password
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
