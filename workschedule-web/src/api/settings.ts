import request from '@/utils/request'

export interface SettingItem {
  id?: number
  settingKey: string
  settingValue: string
  remark?: string
}

export const getSettings = () => request.get('/settings')

export const updateSettings = (items: SettingItem[]) => request.put('/settings', items)

export const getDefaultScheduleMonth = async (): Promise<{ year: number; month: number } | null> => {
  const list: SettingItem[] = await getSettings()
  const item = list.find((s) => s.settingKey === 'defaultScheduleMonth')
  if (!item?.settingValue) return null
  const [yearStr, monthStr] = item.settingValue.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null
  return { year, month }
}
