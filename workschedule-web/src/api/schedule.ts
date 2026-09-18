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

// 管理员初始化某月排班：将非管理员人员的当月所有排班设置为指定值班类型
export const initializeSchedules = (data: { year: number; month: number; shiftTypeId: number }) =>
  request.post('/schedules/initialize', data)

// 管理员清空某月所有非管理员人员的排班
export const clearAllSchedules = (data: { year: number; month: number }) =>
  request.post('/schedules/clear-all', data)

export const lockMonth = (id: number, year: number, month: number) =>
  request.post(`/schedules/${id}/lock`, null, { params: { year, month } })

export const unlockMonth = (id: number, year: number, month: number) =>
  request.post(`/schedules/${id}/unlock`, null, { params: { year, month } })

export const rejectMonth = (id: number, year: number, month: number) =>
  request.post(`/schedules/${id}/reject`, null, { params: { year, month } })
