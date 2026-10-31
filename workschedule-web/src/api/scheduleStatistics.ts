import request from '@/utils/request'

export const getScheduleStatistics = (params?: { startMonth?: string; endMonth?: string }) =>
  request.get('/schedule-statistics', { params })

export const getStatisticsStartMonth = () => request.get('/schedule-statistics/start-month')

export const setStatisticsStartMonth = (startMonth: string) =>
  request.post('/schedule-statistics/start-month', { startMonth })

export const getStatisticsEndMonth = () => request.get('/schedule-statistics/end-month')

export const setStatisticsEndMonth = (endMonth: string) =>
  request.post('/schedule-statistics/end-month', { endMonth })
