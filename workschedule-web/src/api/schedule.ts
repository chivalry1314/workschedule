import request from '@/utils/request'

export const getMySchedules = (year: number, month: number) =>
  request.get('/schedules/mine', { params: { year, month } })

export const saveMySchedules = (data: { year: number; month: number; items: any[] }) =>
  request.post('/schedules/mine', data)

export const submitMySchedules = (year: number, month: number) =>
  request.post('/schedules/mine/submit', null, { params: { year, month } })

export const getAllSchedules = (year: number, month: number, params?: any) =>
  request.get('/schedules/all', { params: { year, month, ...params } })

export const getUserSchedules = (userId: number, year: number, month: number) =>
  request.get(`/schedules/users/${userId}`, { params: { year, month } })

// 管理员调整指定人员的排班
export const saveUserSchedules = (userId: number, data: { year: number; month: number; items: any[] }) =>
  request.put(`/schedules/users/${userId}`, data)

// 管理员清除指定人员某月全部排班
export const clearUserSchedules = (userId: number, year: number, month: number) =>
  request.post(`/schedules/users/${userId}/clear`, null, { params: { year, month } })

export const lockMonth = (id: number, year: number, month: number) =>
  request.post(`/schedules/${id}/lock`, null, { params: { year, month } })

export const unlockMonth = (id: number, year: number, month: number) =>
  request.post(`/schedules/${id}/unlock`, null, { params: { year, month } })

export const rejectMonth = (id: number, year: number, month: number) =>
  request.post(`/schedules/${id}/reject`, null, { params: { year, month } })
