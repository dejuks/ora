import React, { useState } from "react";
import { Link } from "react-router-dom";
import { KeyOutlined } from "@ant-design/icons";

import { describeError, forgotPassword } from "../services/authService";
import {
  AuthShell,
  FormAlert,
  SubmitButton,
  TextField,
} from "../components/AuthUi";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setError("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const response = await forgotPassword(email.trim());
      setDone(response.message);
    } catch (err) {
      setError(describeError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      icon={<KeyOutlined />}
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link
          to="/login"
          className="font-bold text-[#7A1849] hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <FormAlert type="success">{done}</FormAlert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <TextField
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <FormAlert>{error}</FormAlert>
          <SubmitButton loading={loading} loadingText="Sending...">
            Send reset link
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
