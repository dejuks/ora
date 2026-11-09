import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";

/**
 * Guards a group of routes.
 *  - not signed in            -> /login (remembering where they were going)
 *  - temporary password       -> /change-password
 *  - superAdminOnly + others  -> /account
 */
export default function ProtectedRoute({ superAdminOnly = false }) {
  const { user, loading, signedOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] text-[13px] text-gray-500">
        Loading your session...
      </div>
    );
  }

  if (!user) {
    // After an explicit sign-out do not remember the page, otherwise the next
  // person to sign in would be sent to it.
  return (
      <Navigate
        to="/login"
        replace
        state={signedOut ? undefined : { from: location }}
      />
    );
  }

  if (
    user.mustChangePassword &&
    location.pathname !== "/change-password"
  ) {
    return <Navigate to="/change-password" replace />;
  }

  if (superAdminOnly && !user.isSuperAdmin) {
    return <Navigate to="/account" replace />;
  }

  return <Outlet />;
}
