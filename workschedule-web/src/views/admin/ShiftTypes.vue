<template>
  <div class="admin-shift-types">
    <div class="toolbar">
      <van-button type="primary" icon="plus" size="small" @click="create">添加类型</van-button>
    </div>

    <van-cell-group inset>
      <van-cell
        v-for="type in list"
        :key="type.id"
        :title="type.name"
        :label="type.code"
        @click="edit(type)"
      >
        <template #value>
          <van-tag :color="type.color">{{ type.status === 1 ? '启用' : '禁用' }}</van-tag>
        </template>
      </van-cell>
    </van-cell-group>

    <van-popup v-model:show="showCreate" position="bottom" round :style="{ height: '70%' }">
      <div class="form-wrap">
        <h3>{{ editing ? '编辑值班类型' : '添加值班类型' }}</h3>
        <van-field v-model="form.name" label="名称" placeholder="如：白班" />
        <van-field v-model="form.code" label="编码" placeholder="如：day-shift" :disabled="editing" />

        <div class="color-field">
          <label class="color-label">颜色</label>
          <div class="color-input-row">
            <input v-model="form.color" type="color" class="native-color-picker" />
            <van-field v-model="form.color" placeholder="#3B82F6" class="color-hex" />
          </div>
          <div class="color-palette">
            <div
              v-for="c in presetColors"
              :key="c"
              class="color-swatch"
              :style="{ backgroundColor: c }"
              :class="{ active: form.color.toUpperCase() === c.toUpperCase() }"
              @click="form.color = c"
            />
          </div>
        </div>

        <van-field v-model="form.timeRange" label="时间段" placeholder="09:00-18:00" />
        <van-field v-model="form.remark" label="备注" placeholder="可选" />
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
import { getShiftTypes, createShiftType, updateShiftType, deleteShiftType } from '@/api/shiftType'
import { withLoading } from '@/utils/loading'

const list = ref<any[]>([])
const showCreate = ref(false)
const editing = ref(false)

const presetColors = [
  '#F44336',
  '#E91E63',
  '#9C27B0',
  '#673AB7',
  '#3F51B5',
  '#2196F3',
  '#03A9F4',
  '#00BCD4',
  '#009688',
  '#4CAF50',
  '#8BC34A',
  '#CDDC39',
  '#FFEB3B',
  '#FFC107',
  '#FF9800',
  '#FF5722',
  '#795548',
  '#607D8B',
]

const form = reactive({
  id: 0,
  name: '',
  code: '',
  color: '#3B82F6',
  timeRange: '',
  remark: '',
})

const loadData = async () => {
  list.value = await getShiftTypes()
}

const create = () => {
  editing.value = false
  form.id = 0
  form.name = ''
  form.code = ''
  form.color = '#3B82F6'
  form.timeRange = ''
  form.remark = ''
  showCreate.value = true
}

const edit = (type: any) => {
  editing.value = true
  form.id = Number(type.id)
  form.name = type.name
  form.code = type.code
  form.color = type.color
  form.timeRange = type.timeRange || ''
  form.remark = type.remark || ''
  showCreate.value = true
}

const onSubmit = async () => {
  const data = {
    name: form.name,
    code: form.code,
    color: form.color,
    timeRange: form.timeRange,
    remark: form.remark,
  }
  if (editing.value) {
    await withLoading(() => updateShiftType(form.id, data))
  } else {
    await withLoading(() => createShiftType(data))
  }
  showToast('保存成功')
  showCreate.value = false
  loadData()
}

const remove = async () => {
  await showConfirmDialog({ title: '确认删除', message: '删除后无法恢复，是否继续？' })
  await withLoading(() => deleteShiftType(form.id), '删除中...')
  showToast('删除成功')
  showCreate.value = false
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.admin-shift-types {
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


.color-field {
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.color-label {
  display: block;
  font-size: 14px;
  color: #323233;
  margin-bottom: 8px;
}

.color-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.native-color-picker {
  width: 48px;
  height: 36px;
  border: none;
  padding: 0;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
}

.color-hex {
  flex: 1;
}

.color-hex :deep(.van-field__control) {
  text-transform: uppercase;
}

.color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.color-swatch.active {
  border-color: #333;
}
