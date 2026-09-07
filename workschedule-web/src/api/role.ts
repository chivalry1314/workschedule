import request from '@/utils/request'

export interface CreateRoleForm {
  name: string
  remark?: string
  shiftTypeIds?: number[]
}

export const getRoles = () => request.get('/roles')
export const createRole = (data: CreateRoleForm) => request.post('/roles', data)
export const updateRole = (id: number, data: CreateRoleForm) => request.put(`/roles/${id}`, data)
export const deleteRole = (id: number) => request.delete(`/roles/${id}`)
