import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  config.headers['X-Request-ID'] = crypto.randomUUID()
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const requestUrl = String(originalRequest.url ?? '')
      const skipRefresh = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'].some(
        (path) => requestUrl.includes(path),
      )
      const publicPaths = ['/login', '/forgot-password', '/reset-password']
      const isOnPublicPage =
        typeof window !== 'undefined' && publicPaths.some((path) => window.location.pathname.startsWith(path))

      if (skipRefresh) {
        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        await axios.post(`${api.defaults.baseURL}/auth/refresh`, undefined, {
          withCredentials: true,
          timeout: 30000,
        })
        return api(originalRequest)
      } catch (refreshError) {
        if (!isOnPublicPage && typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export default api
