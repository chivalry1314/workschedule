import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  // GitHub Pages 是纯静态托管，无法配置 SPA 回退，
  // 使用 hash 路由保证刷新/直接访问任意子路径都不 404
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/Login.vue'),
    },
    {
      path: '/change-password',
      name: 'ChangePassword',
      component: () => import('@/views/auth/ChangePassword.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      redirect: '/dashboard',
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/dashboard/Dashboard.vue'),
        },
        {
          path: 'my-schedule',
          name: 'MySchedule',
          component: () => import('@/views/schedule/MySchedule.vue'),
        },
        {
          path: 'all-schedule',
          name: 'AllSchedule',
          component: () => import('@/views/schedule/AllSchedule.vue'),
        },
        {
          path: 'swaps',
          name: 'Swaps',
          component: () => import('@/views/swap/Swaps.vue'),
        },
        {
          path: 'profile',
          name: 'Profile',
          component: () => import('@/views/profile/Profile.vue'),
        },
        {
          path: 'admin/users',
          name: 'AdminUsers',
          component: () => import('@/views/admin/Users.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'admin/roles',
          name: 'AdminRoles',
          component: () => import('@/views/admin/Roles.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'admin/shift-types',
          name: 'AdminShiftTypes',
          component: () => import('@/views/admin/ShiftTypes.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'admin/schedule-rules',
          name: 'AdminScheduleRules',
          component: () => import('@/views/admin/ScheduleRules.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'admin/settings',
          name: 'AdminSettings',
          component: () => import('@/views/admin/Settings.vue'),
          meta: { requiresAdmin: true },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const userStore = useUserStore()

  // 已登录用户访问登录页 → 回到首页
  if (to.path === '/login') {
    return userStore.token ? { path: '/' } : true
  }

  // 除登录页外所有页面都需要登录
  if (!userStore.token) {
    return { path: '/login' }
  }

  // 有 token 但未加载用户信息（刷新页面/新标签页）：
  // 向服务端校验登录状态，token 无效或用户被停用则清理并跳回登录页
  if (!userStore.userInfo) {
    try {
      await userStore.fetchMe()
    } catch {
      userStore.clearSession()
      return { path: '/login' }
    }
  }

  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    return { path: '/' }
  }

  if (to.path !== '/change-password' && userStore.userInfo?.firstLogin) {
    return { path: '/change-password' }
  }

  return true
})

export default router
