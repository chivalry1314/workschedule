import request from '@/utils/request'

export interface CreateShiftTypeForm {
  name: string
  code: string
  color?: string
  timeRange?: string
  remark?: string
  status?: number
}

export const getShiftTypes = () => request.get('/shift-types')
export const createShiftType = (data: CreateShiftTypeForm) => request.post('/shift-types', data)
export const updateShiftType = (id: number, data: CreateShiftTypeForm) =>
  request.put(`/shift-types/${id}`, data)
export const deleteShiftType = (id: number) => request.delete(`/shift-types/${id}`)
export const toggleShiftTypeStatus = (id: number) => request.patch(`/shift-types/${id}/status`)
