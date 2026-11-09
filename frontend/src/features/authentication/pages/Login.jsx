import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LockOutlined } from "@ant-design/icons";

import { homePathFor, useAuth } from "../../../context/AuthContext";
import {
  describeError,
  resendVerification,
} from "../services/authService";
import {
  AuthShell,
  FormAlert,
  PasswordField,
  SubmitButton,
  TextField,
} from "../components/AuthUi";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: sessionLoading, login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [notice, setNotice] = useState(
    location.state?.notice || ""
  );

  // Already signed in (or session restored): go to the right place.
  useEffect(() => {
    if (!sessionLoading && user) {
      const from = location.state?.from?.pathname;
      const target =
        user.mustChangePassword || !from || from === "/login"
          ? homePathFor(user)
          : from;
      navigate(target, { replace: true });
    }
  }, [user, sessionLoading, navigate, location.state]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (loading) return;

    setError("");
    setErrorCode("");
    setNotice("");

    if (!identifier.trim() || !password) {
      setError("Please enter your email/username and password.");
      return;
    }

    try {
      setLoading(true);
      await login({
        identifier: identifier.trim(),
        password,
        rememberMe: remember,
      });
      // Navigation happens in the effect above once the user is loaded.
    } catch (err) {
      const info = describeError(err, "Unable to sign in.");
      setErrorCode(info.code || "");
      setError(
        err.response?.status >= 500
          ? "Authentication service error. Please try again later."
          : info.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendVerification(identifier.trim().toLowerCase());
      setError("");
      setErrorCode("");
      setNotice(
        "If that address belongs to an unverified account, a new verification email is on its way."
      );
    } catch (err) {
      setError(describeError(err).message);
    }
  };

  return (
    <AuthShell
      icon={<LockOutlined />}
      title="Sign in"
      subtitle="Enter your credentials to access your ORA account."
      footer={
        <>
          New to ORA?{" "}
          <Link
            to="/register"
            className="font-bold text-[#7A1849] hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-5" noValidate>
        <TextField
          id="identifier"
          label="Email address or username"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Enter your email or username"
          disabled={loading}
        />

        <PasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          disabled={loading}
          labelAction={
            <Link
              to="/forgot-password"
              className="text-[11px] font-bold text-[#7A1849] hover:underline"
            >
              Forgot password?
            </Link>
          }
        />

        <div className="flex items-center">
          <input
            type="checkbox"
            id="remember"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 accent-[#7A1849] cursor-pointer"
            disabled={loading}
          />
          <label
            htmlFor="remember"
            className="ml-2 text-[13px] text-gray-600 cursor-pointer"
          >
            Keep me signed in for 30 days
          </label>
        </div>

        <FormAlert type="info">{notice}</FormAlert>

        <FormAlert>
          {error}
          {errorCode === "EMAIL_NOT_VERIFIED" && (
            <>
              {" "}
              <button
                type="button"
                onClick={handleResend}
                className="font-bold underline"
              >
                Resend verification email
              </button>
            </>
          )}
        </FormAlert>

        <SubmitButton loading={loading} loadingText="Signing in...">
          Sign in
        </SubmitButton>
      </form>

      <p className="text-center text-[12px] text-gray-400 mt-8">
        Protected by ORA Security. Unauthorized access is prohibited.
      </p>
    </AuthShell>
  );
}
