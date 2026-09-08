<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="title">排班管理系统</h1>
      <van-form @submit="onSubmit">
        <van-field
          v-model="form.username"
          name="username"
          label="用户名"
          placeholder="请输入用户名"
          :rules="[{ required: true, message: '请填写用户名' }]"
        />
        <van-field
          v-model="form.password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '请填写密码' }]"
        />
        <div class="submit-wrap">
          <van-button round block type="primary" native-type="submit" :loading="loading">
            登录
          </van-button>
        </div>
      </van-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
})

const onSubmit = async () => {
  loading.value = true
  try {
    const user = await userStore.login(form)
    showToast('登录成功')
    if (user.firstLogin) {
      router.push('/change-password')
    } else {
      router.push('/')
    }
  } catch (err: any) {
    showToast(err?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  padding: 16px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 12px;
  padding: 32px 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.title {
  text-align: center;
  margin-bottom: 32px;
  font-size: 24px;
  color: #333;
}

.submit-wrap {
  margin-top: 24px;
}

.tips {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: #999;
}
</style>
