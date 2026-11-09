import apiClient, {
  publicClient,
  refreshSession,
} from "../../../lib/apiClient";

const unwrap = (response) => response.data;

export const login = async ({ identifier, password, rememberMe }) =>
  unwrap(
    await publicClient.post("/auth/login", {
      identifier,
      password,
      rememberMe: Boolean(rememberMe),
    })
  );

export const register = async (payload) =>
  unwrap(await publicClient.post("/auth/register", payload));

export const verifyEmail = async (token) =>
  unwrap(await publicClient.post("/auth/verify-email", { token }));

export const resendVerification = async (email) =>
  unwrap(await publicClient.post("/auth/resend-verification", { email }));

export const forgotPassword = async (email) =>
  unwrap(await publicClient.post("/auth/forgot-password", { email }));

export const resetPassword = async ({ token, password }) =>
  unwrap(
    await publicClient.post("/auth/reset-password", { token, password })
  );

export const logout = async () =>
  unwrap(await publicClient.post("/auth/logout"));

export const getMe = async () =>
  unwrap(await apiClient.get("/auth/me"));

export const updateMe = async (payload) =>
  unwrap(await apiClient.patch("/auth/me", payload));

export const changePassword = async ({ currentPassword, newPassword }) =>
  unwrap(
    await apiClient.post("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    })
  );

export { refreshSession };

/** Turn an axios error into a message plus per-field errors. */
export function describeError(error, fallback = "Something went wrong.") {
  const data = error?.response?.data;

  if (!error?.response) {
    return {
      message: "Unable to reach the server. Check your connection.",
      fields: {},
      code: "NETWORK_ERROR",
    };
  }

  const fields = {};
  if (data?.errors && !Array.isArray(data.errors)) {
    for (const [key, value] of Object.entries(data.errors)) {
      fields[key] = Array.isArray(value) ? value[0] : String(value);
    }
  }

  return {
    message: data?.message || fallback,
    fields,
    code: data?.code,
    retryAfterSeconds: data?.retryAfterSeconds,
  };
}
