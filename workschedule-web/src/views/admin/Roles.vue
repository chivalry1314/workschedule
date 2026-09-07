<template>
  <div class="admin-roles">
    <div class="toolbar">
      <van-button type="primary" icon="plus" size="small" @click="create">添加角色</van-button>
    </div>

    <van-cell-group inset>
      <van-cell
        v-for="role in list"
        :key="role.id"
        :title="role.name"
        :label="role.remark"
        @click="edit(role)"
      />
    </van-cell-group>

    <van-popup v-model:show="showCreate" position="bottom" round :style="{ height: '70%' }">
      <div class="form-wrap">
        <h3>{{ editing ? '编辑角色' : '添加角色' }}</h3>
        <van-field v-model="form.name" label="角色名称" placeholder="请输入角色名称" />
        <van-field v-model="form.remark" label="备注" placeholder="可选" />
        <div class="shift-select">
          <div class="label">值班类型</div>
          <van-checkbox-group v-model="form.shiftTypeIds">
            <van-checkbox
              v-for="type in shiftTypes"
              :key="type.id"
              :name="Number(type.id)"
            >
              {{ type.name }}
            </van-checkbox>
          </van-checkbox-group>
        </div>
        <div class="form-actions">
          <van-button round block type="primary" @click="onSubmit">保存</van-button>
          <van-button v-if="editing" round block type="danger" @click="remove">删除</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { getRoles, createRole, updateRole, deleteRole } from '@/api/role'
import { getShiftTypes } from '@/api/shiftType'
import { withLoading } from '@/utils/loading'

const list = ref<any[]>([])
const shiftTypes = ref<any[]>([])
const showCreate = ref(false)
const editing = ref(false)

const form = reactive({
  id: 0,
  name: '',
  remark: '',
  shiftTypeIds: [] as number[],
})

const loadData = async () => {
  list.value = await getRoles()
  shiftTypes.value = await getShiftTypes()
}

const create = () => {
  editing.value = false
  form.id = 0
  form.name = ''
  form.remark = ''
  form.shiftTypeIds = []
  showCreate.value = true
}

const edit = (role: any) => {
  editing.value = true
  form.id = Number(role.id)
  form.name = role.name
  form.remark = role.remark || ''
  form.shiftTypeIds = role.shiftTypes?.map((st: any) => Number(st.shiftType?.id)) || []
  showCreate.value = true
}

const onSubmit = async () => {
  const data = { name: form.name, remark: form.remark, shiftTypeIds: form.shiftTypeIds }
  if (editing.value) {
    await withLoading(() => updateRole(form.id, data))
  } else {
    await withLoading(() => createRole(data))
  }
  showToast('保存成功')
  showCreate.value = false
  loadData()
}

const remove = async () => {
  await showConfirmDialog({ title: '确认删除', message: '删除后无法恢复，是否继续？' })
  await withLoading(() => deleteRole(form.id), '删除中...')
  showToast('删除成功')
  showCreate.value = false
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.admin-roles {
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

.shift-select {
  padding: 10px 16px;
}

.label {
  color: #646566;
  font-size: 14px;
  margin-bottom: 8px;
}

.form-actions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
