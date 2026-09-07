import request from '@/utils/request'

export interface CreateUserForm {
  username: string
  initialPassword: string
  realName: string
  roleId: number
  phone?: string
  remark?: string
  isAdmin?: boolean
  status?: number
}

export interface UpdateUserForm {
  realName?: string
  roleId?: number
  phone?: string
  remark?: string
  isAdmin?: boolean
  status?: number
}

export const getUsers = (params?: any) => request.get('/users', { params })
export const createUser = (data: CreateUserForm) => request.post('/users', data)
export const updateUser = (id: number, data: UpdateUserForm) => request.put(`/users/${id}`, data)
export const deleteUser = (id: number) => request.delete(`/users/${id}`)
export const resetPassword = (id: number, password: string) =>
  request.post(`/users/${id}/reset-password`, { password })
