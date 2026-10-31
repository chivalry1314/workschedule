import request from '@/utils/request'

export interface ScheduleTemplateUserItem {
  userId: number
  monday?: number | null
  tuesday?: number | null
  wednesday?: number | null
  thursday?: number | null
  friday?: number | null
  saturday?: number | null
  sunday?: number | null
}

export interface CreateScheduleTemplateForm {
  name: string
  templateType?: number
  replaceShiftTypeId?: number | null
  replacedShiftTypeId?: number | null
  targetUserIds?: number[]
  items?: ScheduleTemplateUserItem[]
}

export interface UpdateScheduleTemplateForm {
  name?: string
  status?: number
  templateType?: number
  replaceShiftTypeId?: number | null
  replacedShiftTypeId?: number | null
  targetUserIds?: number[]
  items?: ScheduleTemplateUserItem[]
}

export const getScheduleTemplates = (params?: any) =>
  request.get('/schedule-templates', { params })

export const getActiveScheduleTemplates = () =>
  request.get('/schedule-templates/active')

export const getScheduleTemplate = (id: number) =>
  request.get(`/schedule-templates/${id}`)

export const createScheduleTemplate = (data: CreateScheduleTemplateForm) =>
  request.post('/schedule-templates', data)

export const updateScheduleTemplate = (id: number, data: UpdateScheduleTemplateForm) =>
  request.put(`/schedule-templates/${id}`, data)

export const deleteScheduleTemplate = (id: number) =>
  request.delete(`/schedule-templates/${id}`)
