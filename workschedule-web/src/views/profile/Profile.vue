<template>
  <div class="profile">
    <div class="user-card">
      <van-icon name="user-circle-o" size="60" color="#fff" />
      <div class="user-info">
        <div class="name">{{ userStore.userInfo?.realName }}</div>
        <div class="meta">{{ userStore.userInfo?.username }} · {{ userStore.userInfo?.role?.name }}</div>
      </div>
    </div>

    <van-cell-group inset class="menu-group">
      <van-cell title="修改密码" is-link icon="lock" @click="showChange = true" />
      <van-cell title="我的排班" is-link icon="calendar-o" to="/my-schedule" />
      <van-cell title="换班申请" is-link icon="exchange" to="/swaps" />
    </van-cell-group>

    <div class="logout">
      <van-button round block type="danger" @click="userStore.logout">退出登录</van-button>
    </div>

    <van-popup v-model:show="showChange" position="bottom" round :style="{ height: '50%' }">
      <div class="change-form">
        <h3>修改密码</h3>
        <van-field v-model="form.oldPassword" type="password" label="原密码" placeholder="请输入原密码" />
        <van-field v-model="form.newPassword" type="password" label="新密码" placeholder="至少8位，含字母和数字" />
        <van-field v-model="form.confirmPassword" type="password" label="确认新密码" placeholder="请再次输入" />
        <van-button round block type="primary" @click="onChangePassword">确认修改</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { showToast } from 'vant'
import { useUserStore } from '@/stores/user'
import { withLoading } from '@/utils/loading'

const userStore = useUserStore()
const showChange = ref(false)
const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const onChangePassword = async () => {
  if (form.newPassword !== form.confirmPassword) {
    showToast('两次输入不一致')
    return
  }
  await withLoading(() => userStore.changePassword(form))
  showToast('密码修改成功')
  showChange.value = false
}
</script>

<style scoped>
.profile {
  padding: 16px;
}

.user-card {
  background: linear-gradient(135deg, #1989fa, #39a9fa);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: #fff;
  margin-bottom: 16px;
}

.user-info {
  flex: 1;
}

.name {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 4px;
}

.meta {
  opacity: 0.9;
  font-size: 14px;
}

.menu-group {
  margin-bottom: 16px;
}

.logout {
  margin-top: 24px;
}

.change-form {
  padding: 16px;
}

.change-form h3 {
  text-align: center;
  margin-bottom: 16px;
}
</style>
