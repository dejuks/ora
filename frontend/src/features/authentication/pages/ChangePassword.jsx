import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { SafetyCertificateOutlined } from "@ant-design/icons";

import { homePathFor, useAuth } from "../../../context/AuthContext";
import { AuthShell } from "../components/AuthUi";
import ChangePasswordForm from "../components/ChangePasswordForm";

/** Forced step after signing in with a temporary password. */
export default function ChangePassword() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (user && !user.mustChangePassword) {
    return <Navigate to={homePathFor(user)} replace />;
  }

  return (
    <AuthShell
      icon={<SafetyCertificateOutlined />}
      title="Set a new password"
      subtitle="You signed in with a temporary password. Choose your own to continue."
      footer={
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate("/login", { replace: true });
          }}
          className="font-bold text-[#7A1849] hover:underline"
        >
          Sign out
        </button>
      }
    >
      <ChangePasswordForm
        onSuccess={() => navigate("/", { replace: true })}
      />
    </AuthShell>
  );
}
