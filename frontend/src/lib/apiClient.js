import axios from "axios";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:4000/api/v1";

const defaults = {
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

/**
 * The access token is kept in memory only (never in localStorage or
 * sessionStorage). The long-lived refresh token lives in an httpOnly
 * cookie managed by the auth service, so a page reload restores the
 * session through POST /auth/refresh.
 */
let accessToken = null;
let sessionExpiredHandler = () => {};

export const setAccessToken = (token) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;
export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = handler;
};

/** Client without interceptors: login, register, refresh, etc. */
export const publicClient = axios.create(defaults);

/** Client for authenticated requests (adds Bearer, refreshes on 401). */
const apiClient = axios.create(defaults);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let refreshPromise = null;

/**
 * Exchange the refresh cookie for a new access token.
 * Concurrent callers (React StrictMode, parallel requests) share one
 * request, because a refresh token can only be used once.
 */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        let response;
        try {
          response = await publicClient.post("/auth/refresh");
        } catch (error) {
          // Another tab rotated the cookie a moment ago: retry once.
          if (error.response?.data?.code === "REFRESH_TOKEN_RACE") {
            await sleep(500);
            response = await publicClient.post("/auth/refresh");
          } else {
            throw error;
          }
        }

        accessToken = response.data.data.accessToken;
        return accessToken;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry
    ) {
      original._retry = true;

      try {
        const token = await refreshSession();
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      } catch (refreshError) {
        accessToken = null;
        sessionExpiredHandler();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
