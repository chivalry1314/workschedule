<template>
  <div class="dashboard">
    <div class="welcome">
      <h2>你好，{{ userStore.userInfo?.realName || '用户' }}</h2>
      <p>{{ today }}</p>
    </div>

    <div class="quick-actions">
      <van-grid :column-num="2" gutter="12">
        <van-grid-item icon="calendar-o" text="填写排班" to="/my-schedule" />
        <van-grid-item icon="friends-o" text="查看总排班" to="/all-schedule" />
        <van-grid-item icon="exchange" text="换班申请" to="/swaps" />
        <van-grid-item icon="user-o" text="个人中心" to="/profile" />
      </van-grid>
    </div>

    <div class="notice">
      <van-cell title="本月排班状态" :value="statusText" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const today = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
})

const statusText = computed(() => '草稿')
</script>

<style scoped>
.dashboard {
  padding: 16px;
}

.welcome {
  background: linear-gradient(135deg, #1989fa, #39a9fa);
  color: #fff;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.welcome h2 {
  margin: 0 0 8px;
  font-size: 22px;
}

.welcome p {
  margin: 0;
  opacity: 0.9;
}

.quick-actions {
  margin-bottom: 16px;
}

.notice {
  background: #fff;
  border-radius: 8px;
}
</style>
