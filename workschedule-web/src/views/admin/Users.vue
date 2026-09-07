<template>
  <div class="admin-users">
    <div class="toolbar">
      <van-button type="primary" icon="plus" size="small" @click="create">添加人员</van-button>
    </div>

    <van-list>
      <van-cell-group inset>
        <van-cell
          v-for="user in list"
          :key="user.id"
          :title="user.realName"
          :label="user.username"
          :value="user.role?.name"
          @click="edit(user)"
        />
      </van-cell-group>
    </van-list>

    <van-popup v-model:show="showCreate" position="bottom" round :style="{ height: '80%' }">
      <div class="form-wrap">
        <h3>{{ editing ? '编辑人员' : '添加人员' }}</h3>
        <van-field v-model="form.username" label="用户名" placeholder="请输入用户名" :disabled="editing" />
        <van-field v-model="form.realName" label="姓名" placeholder="请输入姓名" />
        <van-field v-model="form.initialPassword" type="password" label="初始密码" placeholder="至少8位含字母数字" />
        <van-field label="角色" is-link readonly :model-value="roleName" @click="showRolePicker = true" />
        <van-field v-model="form.phone" label="手机号" placeholder="可选" />
        <van-field v-model="form.remark" label="备注" placeholder="可选" />
        <div class="form-actions">
          <van-button round block type="primary" @click="onSubmit">保存</van-button>
          <van-button v-if="editing" round block type="warning" @click="openResetPassword">重置密码</van-button>
          <van-button v-if="editing" round block type="danger" @click="remove">删除</van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="showRolePicker" position="bottom" round>
      <van-picker
        :columns="roleColumns"
        :default-index="roleIndex"
        @confirm="onRoleSelect"
        @cancel="showRolePicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showResetPwd" position="bottom" round :style="{ height: '40%' }">
      <div class="form-wrap">
        <h3>重置密码</h3>
        <van-field v-model="resetPwdForm.password" type="password" label="新密码" placeholder="留空则系统自动生成" />
        <div class="form-actions">
          <van-button round block type="primary" @click="onResetPassword">确认重置</van-button>
          <van-button round block @click="showResetPwd = false">取消</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { getUsers, createUser, updateUser, deleteUser, resetPassword } from '@/api/user'
import { getRoles } from '@/api/role'
import { withLoading } from '@/utils/loading'

const list = ref<any[]>([])
const roles = ref<any[]>([])
const showCreate = ref(false)
const showRolePicker = ref(false)
const showResetPwd = ref(false)
const editing = ref(false)

const form = reactive({
  id: 0,
  username: '',
  realName: '',
  initialPassword: '',
  roleId: 0,
  phone: '',
  remark: '',
})

const resetPwdForm = reactive({
  password: '',
})

const roleColumns = computed(() => {
  return roles.value.map((r: any) => ({ text: r.name, value: Number(r.id) }))
})

const roleName = computed(() => {
  const role = roles.value.find((r: any) => Number(r.id) === form.roleId)
  return role?.name || '请选择'
})

const roleIndex = computed(() => {
  return roleColumns.value.findIndex((c: any) => c.value === form.roleId)
})

const loadUsers = async () => {
  const res = await getUsers()
  list.value = res.list
}

const loadRoles = async () => {
  roles.value = await getRoles()
}

const resetForm = () => {
  form.id = 0
  form.username = ''
  form.realName = ''
  form.initialPassword = ''
  form.roleId = 0
  form.phone = ''
  form.remark = ''
}

const create = () => {
  editing.value = false
  resetForm()
  showCreate.value = true
}

const edit = (user: any) => {
  editing.value = true
  form.id = Number(user.id)
  form.username = user.username
  form.realName = user.realName
  form.initialPassword = ''
  form.roleId = Number(user.roleId)
  form.phone = user.phone || ''
  form.remark = user.remark || ''
  showCreate.value = true
}

const onRoleSelect = ({ selectedOptions }: any) => {
  form.roleId = selectedOptions[0].value
  showRolePicker.value = false
}

const onSubmit = async () => {
  if (editing.value) {
    await withLoading(() =>
      updateUser(form.id, {
        realName: form.realName,
        roleId: form.roleId,
        phone: form.phone,
        remark: form.remark,
      }),
    )
  } else {
    await withLoading(() =>
      createUser({
        username: form.username,
        realName: form.realName,
        initialPassword: form.initialPassword,
        roleId: form.roleId,
        phone: form.phone,
        remark: form.remark,
      }),
    )
  }
  showToast('保存成功')
  showCreate.value = false
  loadUsers()
}

const remove = async () => {
  await showConfirmDialog({ title: '确认删除', message: '删除后无法恢复，是否继续？' })
  await withLoading(() => deleteUser(form.id), '删除中...')
  showToast('删除成功')
  showCreate.value = false
  loadUsers()
}

const openResetPassword = () => {
  resetPwdForm.password = ''
  showResetPwd.value = true
}

const onResetPassword = async () => {
  const res: any = await withLoading(() => resetPassword(form.id, resetPwdForm.password), '重置中...')
  showToast(`密码已重置：${res.password}`)
  showResetPwd.value = false
}

onMounted(() => {
  loadUsers()
  loadRoles()
})
</script>

<style scoped>
.admin-users {
  padding: 12px;
}

.toolbar {
  margin-bottom: 12px;
}

.form-wrap {
  padding: 16px;
}

.form-wrap h3 {
  text-align: center;
  margin-bottom: 16px;
}

.form-actions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
