import request from '@/utils/request'

export interface LoginForm {
  username: string
  password: string
}

export interface ChangePasswordForm {
  oldPassword: string
  newPassword: string
}

export const login = (data: LoginForm) => request.post('/auth/login', data)

export const getMe = () => request.get('/auth/me')

export const changePassword = (data: ChangePasswordForm) =>
  request.post('/auth/password', data)
