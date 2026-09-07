import axios, { type AxiosInstance } from 'axios'
import { showToast } from 'vant'
import { useUserStore } from '@/stores/user'
import router from '@/router'

const axiosInstance: AxiosInstance = axios.create({
  // 本地开发走 vite proxy（/api/v1）；
  // 部署到 GitHub Pages 时通过 VITE_API_BASE_URL 指向公网后端地址
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
})

function extractMessage(value: any): string {
  if (!value) return '请求失败'
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value.map((v) => extractMessage(v)).join('；') || '请求失败'
  }
  if (typeof value === 'object') {
    return value.message || value.error || JSON.stringify(value)
  }
  return String(value)
}

// 错误提示展示时间加长，避免用户来不及看清
function showErrorToast(message: string) {
  showToast({ message: message || '请求失败', duration: 4000 })
}

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

axiosInstance.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data && data.code !== undefined && data.code !== 0) {
      const msg = extractMessage(data.message || data.msg)
      showToast(msg)
      return Promise.reject(data)
    }
    return data && 'data' in data ? data.data : data
  },
  (error) => {
    const rawMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message
    const message = extractMessage(rawMessage)

    // 先弹出提示，再跳转/清理，避免路由切换导致 Toast 不显示
    if (error.response?.status === 401) {
      showErrorToast(message || '登录已过期，请重新登录')
      const userStore = useUserStore()
      userStore.logout()
      setTimeout(() => router.push('/login'), 1500)
    } else {
      showErrorToast(message)
    }

    return Promise.reject(error)
  },
)

const request = {
  get: (url: string, config?: any): Promise<any> => axiosInstance.get(url, config),
  post: (url: string, data?: any, config?: any): Promise<any> => axiosInstance.post(url, data, config),
  put: (url: string, data?: any, config?: any): Promise<any> => axiosInstance.put(url, data, config),
  delete: (url: string, config?: any): Promise<any> => axiosInstance.delete(url, config),
  patch: (url: string, data?: any, config?: any): Promise<any> => axiosInstance.patch(url, data, config),
}

export default request
