<template>
  <div class="main-layout">
    <van-nav-bar
      :title="(route.meta.title as string) || '排班系统'"
      left-text="菜单"
      left-arrow
      @click-left="showMenu = true"
    />

    <div class="page-content">
      <router-view />
    </div>

    <van-tabbar v-model="activeTab" route safe-area-inset-bottom z-index="100">
      <van-tabbar-item to="/dashboard" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item to="/my-schedule" icon="calendar-o">我的排班</van-tabbar-item>
      <van-tabbar-item to="/all-schedule" icon="friends-o">总排班</van-tabbar-item>
      <van-tabbar-item to="/swaps" icon="exchange">换班</van-tabbar-item>
      <van-tabbar-item to="/profile" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>

    <van-popup v-model:show="showMenu" position="left" :style="{ width: '70%', height: '100%' }">
      <div class="menu-panel">
        <div class="menu-header">
          <div class="user-name">{{ userStore.userInfo?.realName || '未登录' }}</div>
          <div class="user-role">{{ userStore.userInfo?.role?.name || '' }}</div>
        </div>
        <van-cell title="首页" icon="home-o" to="/dashboard" @click="showMenu = false" />
        <van-cell title="我的排班" icon="calendar-o" to="/my-schedule" @click="showMenu = false" />
        <van-cell title="总排班" icon="friends-o" to="/all-schedule" @click="showMenu = false" />
        <van-cell title="换班申请" icon="exchange" to="/swaps" @click="showMenu = false" />
        <template v-if="userStore.isAdmin">
          <van-divider>管理</van-divider>
          <van-cell title="人员管理" icon="manager-o" to="/admin/users" @click="showMenu = false" />
          <van-cell title="角色管理" icon="cluster-o" to="/admin/roles" @click="showMenu = false" />
          <van-cell title="值班类型" icon="label-o" to="/admin/shift-types" @click="showMenu = false" />
          <van-cell title="排班规则" icon="orders-o" to="/admin/schedule-rules" @click="showMenu = false" />
        </template>
        <div class="logout-wrap">
          <van-button round block type="danger" @click="logout">退出登录</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore()
const activeTab = ref(0)
const showMenu = ref(false)

const logout = () => {
  showMenu.value = false
  userStore.logout()
}

watch(
  () => route.path,
  (path) => {
    const map: Record<string, number> = {
      '/dashboard': 0,
      '/my-schedule': 1,
      '/all-schedule': 2,
      '/swaps': 3,
      '/profile': 4,
    }
    activeTab.value = map[path] ?? -1
  },
  { immediate: true },
)
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  padding-bottom: 60px;
  background: #f5f5f5;
}

.menu-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.menu-header {
  padding: 40px 16px 24px;
  background: linear-gradient(135deg, #1989fa, #39a9fa);
  color: #fff;
}

.user-name {
  font-size: 20px;
  font-weight: bold;
}

.user-role {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 4px;
}

.logout-wrap {
  margin-top: auto;
  padding: 16px;
}
</style>
