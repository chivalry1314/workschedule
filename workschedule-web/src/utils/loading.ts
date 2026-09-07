import { showLoadingToast, allowMultipleToast } from 'vant'

// 允许同时存在多个 Toast：请求失败时拦截器弹出的错误提示
// 不会替换/被关闭掉加载中的提示。
allowMultipleToast(true)

// 统一保存等待动画：调用方只需把请求包在 withLoading 里，
// 结束后自动关闭 loading（通过实例关闭，不影响拦截器弹出的错误提示）。
export async function withLoading<T>(task: () => Promise<T>, message = '保存中...'): Promise<T> {
  const toast = showLoadingToast({ message, forbidClick: true, duration: 0 })
  try {
    return await task()
  } finally {
    toast.close()
  }
}
