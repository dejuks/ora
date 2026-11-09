import axios from "axios";
import { getAccessToken, refreshSession, setSessionExpiredHandler } from "../../lib/apiClient";

const JMS_URL = process.env.REACT_APP_JMS_API_URL || "http://localhost:4001/api/v1/jms";

/** Journal service client. Shares the in-memory access token of the auth client. */
const jms = axios.create({ baseURL: JMS_URL, headers: { Accept: "application/json" } });

jms.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

jms.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry && !original.url?.startsWith("/public")) {
      original._retry = true;
      try {
        const token = await refreshSession();
        original.headers.Authorization = `Bearer ${token}`;
        return jms(original);
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default jms;
export { setSessionExpiredHandler };

/** Readable message from an API error (includes field errors when present). */
export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  const data = error?.response?.data;
  if (!data) return error?.code === "ERR_NETWORK" ? "Cannot reach the journal service. Is it running on port 4001?" : fallback;
  const details = Array.isArray(data.errors) ? data.errors.map((e) => e.message).filter(Boolean) : [];
  return details.length ? `${data.message} ${details.join(" ")}` : data.message || fallback;
}

export const get = async (url, params) => (await jms.get(url, { params })).data;
export const post = async (url, body) => (await jms.post(url, body)).data;
export const put = async (url, body) => (await jms.put(url, body)).data;
export const patch = async (url, body) => (await jms.patch(url, body)).data;
export const del = async (url) => (await jms.delete(url)).data;

/** Open / save a protected file (needs the Authorization header, so not a plain link). */
export async function downloadFile(fileId, fallbackName = "file") {
  const res = await jms.get(`/files/${fileId}/download`, { responseType: "blob" });
  const cd = res.headers["content-disposition"] || "";
  const m = /filename\*=UTF-8''([^;]+)/.exec(cd);
  const name = m ? decodeURIComponent(m[1]) : fallbackName;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
