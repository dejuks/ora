import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MailOutlined, UserAddOutlined } from "@ant-design/icons";

import {
  describeError,
  register,
  resendVerification,
} from "../services/authService";
import {
  AuthShell,
  FormAlert,
  PasswordField,
  SubmitButton,
  TextField,
  isPasswordValid,
} from "../components/AuthUi";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  const update = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (form.first_name.trim().length < 2)
      next.first_name = "Enter your first name.";
    if (form.last_name.trim().length < 2)
      next.last_name = "Enter your last name.";
    if (!/^[a-zA-Z0-9._-]{3,100}$/.test(form.username.trim()))
      next.username =
        "3+ characters: letters, numbers, dots, underscores or hyphens.";
    if (!emailPattern.test(form.email.trim()))
      next.email = "Enter a valid email address.";
    if (!isPasswordValid(form.password))
      next.password = "Password does not meet all requirements.";
    if (form.password !== form.confirm)
      next.confirm = "Passwords do not match.";
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setFormError("");
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      setLoading(true);
      await register({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setRegisteredEmail(form.email.trim().toLowerCase());
    } catch (error) {
      const info = describeError(error, "Registration failed.");
      const mapped = { ...info.fields };
      if (info.code === "EMAIL_ALREADY_EXISTS") mapped.email = info.message;
      if (info.code === "USERNAME_ALREADY_EXISTS")
        mapped.username = info.message;
      setErrors(mapped);
      if (!Object.keys(mapped).length || info.code === "WEAK_PASSWORD") {
        setFormError(info.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendMessage("");
    try {
      await resendVerification(registeredEmail);
      setResendMessage("A new verification email has been sent.");
    } catch (error) {
      setResendMessage(describeError(error).message);
    }
  };

  if (registeredEmail) {
    return (
      <AuthShell
        icon={<MailOutlined />}
        title="Check your email"
        subtitle={`We sent a verification link to ${registeredEmail}.`}
        footer={
          <Link
            to="/login"
            className="font-bold text-[#7A1849] hover:underline"
          >
            Back to sign in
          </Link>
        }
      >
        <div className="space-y-4 text-[13px] text-gray-600 text-center">
          <p>
            Open the email and click the link to activate your account. The
            link is valid for 24 hours.
          </p>
          <FormAlert type="info">{resendMessage}</FormAlert>
          <button
            type="button"
            onClick={handleResend}
            className="font-bold text-[#7A1849] hover:underline"
          >
            Didn't get the email? Send it again
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon={<UserAddOutlined />}
      title="Create your account"
      subtitle="Register as an author on the ORA Digital Platform."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-bold text-[#7A1849] hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            id="first_name"
            label="First name"
            autoComplete="given-name"
            value={form.first_name}
            onChange={update}
            error={errors.first_name}
            disabled={loading}
          />
          <TextField
            id="last_name"
            label="Last name"
            autoComplete="family-name"
            value={form.last_name}
            onChange={update}
            error={errors.last_name}
            disabled={loading}
          />
        </div>

        <TextField
          id="username"
          label="Username"
          autoComplete="username"
          value={form.username}
          onChange={update}
          error={errors.username}
          disabled={loading}
        />

        <TextField
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update}
          error={errors.email}
          disabled={loading}
        />

        <PasswordField
          id="password"
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={update}
          error={errors.password}
          showRules
          disabled={loading}
        />

        <PasswordField
          id="confirm"
          label="Confirm password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={update}
          error={errors.confirm}
          disabled={loading}
        />

        <FormAlert>{formError}</FormAlert>

        <SubmitButton loading={loading} loadingText="Creating account...">
          Create account
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
