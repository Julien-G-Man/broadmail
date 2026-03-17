import axios from "axios";
import { API_URL } from "@/lib/config";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Called from SessionSync (in providers.tsx) whenever the session changes.
 * Sets or clears the Authorization header on every subsequent request.
 */
export function setAccessToken(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export default api;
