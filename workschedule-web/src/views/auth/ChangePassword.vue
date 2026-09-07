<template>
  <div class="change-password-page">
    <van-nav-bar title="修改初始密码" />
    <div class="form-wrap">
      <van-form @submit="onSubmit">
        <van-field
          v-model="form.oldPassword"
          type="password"
          name="oldPassword"
          label="原密码"
          placeholder="请输入原密码"
          :rules="[{ required: true, message: '请填写原密码' }]"
        />
        <van-field
          v-model="form.newPassword"
          type="password"
          name="newPassword"
          label="新密码"
          placeholder="至少8位，含字母和数字"
          :rules="[
            { required: true, message: '请填写新密码' },
            { pattern: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/, message: '新密码需至少8位且含字母和数字' },
          ]"
        />
        <van-field
          v-model="form.confirmPassword"
          type="password"
          name="confirmPassword"
          label="确认新密码"
          placeholder="请再次输入新密码"
          :rules="[
            { required: true, message: '请确认新密码' },
            { validator: validateConfirm, message: '两次输入不一致' },
          ]"
        />
        <div class="submit-wrap">
          <van-button round block type="primary" native-type="submit" :loading="loading">
            确认修改
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
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const validateConfirm = () => form.newPassword === form.confirmPassword

const onSubmit = async () => {
  loading.value = true
  try {
    await userStore.changePassword(form)
    showToast('密码修改成功')
    router.push('/')
  } catch (err: any) {
    showToast(err?.message || '密码修改失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.change-password-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.form-wrap {
  padding: 24px 16px;
}

.submit-wrap {
  margin-top: 32px;
}
</style>
