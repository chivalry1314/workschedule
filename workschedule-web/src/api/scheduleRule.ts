import request from '@/utils/request'

export interface ScheduleRuleItem {
  ruleType: number
  shiftTypeId: number
  maxCount: number
}

export const getScheduleRules = (monthKey: string) =>
  request.get('/schedule-rules', { params: { monthKey } })
export const saveScheduleRules = (monthKey: string, rules: ScheduleRuleItem[]) =>
  request.put('/schedule-rules', { monthKey, rules })
