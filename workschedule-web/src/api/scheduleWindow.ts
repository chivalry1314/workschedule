import request from '@/utils/request'

export interface ScheduleWindow {
  monthKey: string
  startAt?: string | null
  endAt?: string | null
}

export const getScheduleWindow = (monthKey: string) =>
  request.get('/schedule-windows', { params: { monthKey } })
export const saveScheduleWindow = (data: ScheduleWindow) =>
  request.put('/schedule-windows', data)
