import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  withCredentials: true,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  config.headers["X-Request-ID"] = crypto.randomUUID();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid redirect loops: only redirect from non-auth pages to login
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      // Don't redirect if already on login/forgot-password/reset-password pages
      const publicPaths = ["/login", "/forgot-password", "/reset-password"];
      const isOnPublicPage = publicPaths.some((p) => window.location.pathname.startsWith(p));
      if (!isOnPublicPage) {
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // On login page: if auth/me or a login request fails with 401/429,
      // just reject the error so the login form can handle it
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
