import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { portalsFor } from "../roles";

/**
 * Guards one journal portal. A signed-in user may open it when they hold
 * one of the JMS roles of that portal (super admins may open every portal).
 */
export default function RoleRoute({ portal }) {
  const { user, loading, signedOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] text-[13px] text-gray-500">Loading your session...</div>;
  }
  if (!user) return <Navigate to="/login" replace state={signedOut ? undefined : { from: location }} />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (!portalsFor(user).some((p) => p.key === portal)) return <Navigate to="/account" replace />;
  return <Outlet />;
}
