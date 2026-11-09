import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  refreshSession,
  setAccessToken,
  setSessionExpiredHandler,
} from "../lib/apiClient";

import * as authService from "../features/authentication/services/authService";
import { jmsHome } from "../features/jms/roles";

const AuthContext = createContext(null);

/** Where a signed-in user lands. */
export function homePathFor(user) {
  if (!user) return "/login";
  if (user.mustChangePassword) return "/change-password";
  if (user.isSuperAdmin) return "/dashboard";
  return jmsHome(user) || "/account";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // True after an explicit sign-out, so the route guard does not remember
  // the page the previous person was on.
  const [signedOut, setSignedOut] = useState(false);

  const loadUser = useCallback(async () => {
    const response = await authService.getMe();
    setUser(response.data.user);
    return response.data.user;
  }, []);

  // Restore the session after a page reload using the refresh cookie.
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        await refreshSession();
        const response = await authService.getMe();
        if (active) setUser(response.data.user);
      } catch {
        setAccessToken(null);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    setSessionExpiredHandler(() => setUser(null));

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (credentials) => {
      const response = await authService.login(credentials);
      setAccessToken(response.data.accessToken);
      setSignedOut(false);
      return loadUser();
    },
    [loadUser]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // The local session is cleared regardless.
    }
    setSignedOut(true);
    setAccessToken(null);
    setUser(null);
  }, []);

  /** Use after change-password, which returns a fresh access token. */
  const replaceToken = useCallback(
    async (token) => {
      setAccessToken(token);
      return loadUser();
    },
    [loadUser]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      signedOut,
      isAuthenticated: Boolean(user),
      isSuperAdmin: Boolean(user?.isSuperAdmin),
      login,
      logout,
      refreshUser: loadUser,
      replaceToken,
      setUser,
      hasModuleRole: (moduleCode, roleCode) =>
        Boolean(
          user?.modules?.some(
            (module) =>
              module.code === moduleCode &&
              module.roles.some((role) => role.code === roleCode)
          )
        ),
    }),
    [user, loading, signedOut, login, logout, loadUser, replaceToken]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return context;
}
