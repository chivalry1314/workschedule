import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, getMe, changePassword as changePasswordApi } from '@/api/auth'
import router from '@/router'

export interface UserInfo {
  id: number
  username: string
  realName: string
  isAdmin: boolean
  firstLogin: boolean
  role: {
    id: number
    name: string
    shiftTypes: { shiftType: { id: number; name: string; color: string } }[]
  }
}

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref<UserInfo | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.isAdmin || false)

  const setToken = (value: string) => {
    token.value = value
    localStorage.setItem('token', value)
  }

  const setUserInfo = (info: UserInfo) => {
    userInfo.value = info
  }

  const login = async (form: { username: string; password: string }) => {
    const res = await loginApi(form)
    setToken(res.access_token)
    setUserInfo(res.user)
    return res.user
  }

  const changePassword = async (form: { oldPassword: string; newPassword: string }) => {
    await changePasswordApi(form)
    if (userInfo.value) {
      userInfo.value.firstLogin = false
    }
  }

  // 向服务端校验当前 token 并拉取用户信息（刷新页面/新标签页时恢复登录状态）
  const fetchMe = async () => {
    const user = await getMe()
    setUserInfo(user)
    return user
  }

  // 仅清理本地登录状态（不跳转，跳转由路由守卫负责）
  const clearSession = () => {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }

  const logout = () => {
    clearSession()
    router.push('/login')
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    isAdmin,
    login,
    logout,
    changePassword,
    setUserInfo,
    fetchMe,
    clearSession,
  }
})
