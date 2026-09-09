import request from '@/utils/request'

export interface CreateSwapForm {
  applicantScheduleId: number
  targetUserId?: number
  targetScheduleId?: number
  swapType: number
  reason?: string
}

export const getSwaps = () => request.get('/swaps')
export const getAllSwaps = () => request.get('/swaps/all')
export const createSwap = (data: CreateSwapForm) => request.post('/swaps', data)
export const approveSwap = (id: number) => request.post(`/swaps/${id}/approve`)
export const rejectSwap = (id: number) => request.post(`/swaps/${id}/reject`)
export const withdrawSwap = (id: number) => request.post(`/swaps/${id}/withdraw`)
export const deleteSwap = (id: number) => request.delete(`/swaps/${id}`)
