<template>
  <div class="schedule-templates">
    <div class="toolbar">
      <van-button type="primary" icon="plus" size="small" @click="create">新建模板</van-button>
    </div>

    <van-list>
      <van-cell-group inset>
        <van-cell
          v-for="template in templates"
          :key="template.id"
          :title="template.name"
          :label="templateTypeText(template.templateType)"
          :value="template.status === 1 ? '生效中' : '已停用'"
          @click="edit(template)"
        >
          <template #right-icon>
            <van-switch
              :model-value="template.status === 1"
              size="20px"
              @click.stop
              @update:model-value="(v: boolean) => toggleStatus(template, v)"
            />
          </template>
        </van-cell>
      </van-cell-group>
    </van-list>

    <van-empty v-if="templates.length === 0" description="暂无初始化模板" />

    <van-popup v-model:show="showPopup" position="bottom" round :style="{ height: '90%' }">
      <div class="form-wrap">
        <h3>{{ editing ? '编辑模板' : '新建模板' }}</h3>
        <van-field v-model="form.name" label="模板名称" placeholder="请输入模板名称" />
        <van-field
          label="模板类型"
          is-link
          readonly
          :model-value="templateTypeText(form.templateType)"
          @click="showTypePicker = true"
        />

        <template v-if="form.templateType === 2">
          <van-field
            label="被替换班次"
            is-link
            readonly
            :model-value="shiftTypeName(form.replacedShiftTypeId) || '请选择'"
            @click="openReplacedPicker"
          />
          <van-field
            label="替换班次"
            is-link
            readonly
            :model-value="shiftTypeName(form.replaceShiftTypeId) || '请选择'"
            @click="openReplacePicker"
          />
          <div class="user-group">
            <div class="user-group-header">
              <span>适用用户组</span>
              <div class="user-group-actions">
                <van-button size="small" type="primary" @click="selectAllUsers">全选</van-button>
                <van-button size="small" @click="clearAllUsers">清空</van-button>
              </div>
            </div>
            <van-checkbox-group
              v-if="users.length > 0"
              v-model="form.targetUserIds"
              class="user-checkbox-group"
            >
              <van-checkbox
                v-for="user in users"
                :key="user.id"
                :name="Number(user.id)"
                shape="square"
                class="user-checkbox"
              >
                {{ user.realName }}
              </van-checkbox>
            </van-checkbox-group>
            <van-empty v-else description="暂无有效人员" />
          </div>
        </template>

        <div v-else class="table-wrap">
          <table class="template-table" v-if="users.length > 0">
            <thead>
              <tr>
                <th class="name-col">人员</th>
                <th>周一</th>
                <th>周二</th>
                <th>周三</th>
                <th>周四</th>
                <th>周五</th>
                <th>周六</th>
                <th>周日</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td class="name-col">{{ user.realName }}</td>
                <td
                  v-for="day in dayKeys"
                  :key="day"
                  class="shift-cell"
                  :style="cellStyle(getShift(user.id, day))"
                  @click="openShiftPicker(user.id, day)"
                >
                  {{ cellText(getShift(user.id, day)) }}
                </td>
              </tr>
            </tbody>
          </table>
          <van-empty v-else description="暂无有效人员" />
        </div>

        <div class="form-actions">
          <van-button round block type="primary" @click="onSubmit">保存</van-button>
          <van-button v-if="editing" round block type="danger" @click="remove">删除</van-button>
          <van-button round block @click="showPopup = false">取消</van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="showTypePicker" position="bottom" round>
      <van-picker
        :columns="typeColumns"
        :default-index="typeIndex"
        @confirm="onTypeSelect"
        @cancel="showTypePicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showShiftPicker" position="bottom" round>
      <div class="picker-header">
        <span>{{ pickerUser?.realName }} · {{ pickerDayLabel }}</span>
        <van-button size="small" type="danger" @click="setShift(null)">清空</van-button>
      </div>
      <div class="shift-options">
        <van-button
          v-for="type in shiftTypes"
          :key="type.id"
          class="shift-option"
          :style="{ background: type.color, color: '#fff' }"
          @click="setShift(type.id)"
        >
          {{ type.name }}
        </van-button>
      </div>
    </van-popup>

    <van-popup v-model:show="showReplacePicker" position="bottom" round>
      <div class="picker-header">
        <span>选择替换班次</span>
      </div>
      <div class="shift-options">
        <van-button
          v-for="type in shiftTypes"
          :key="type.id"
          class="shift-option"
          :style="{ background: type.color, color: '#fff' }"
          @click="setReplaceShiftType(type.id)"
        >
          {{ type.name }}
        </van-button>
      </div>
    </van-popup>

    <van-popup v-model:show="showReplacedPicker" position="bottom" round>
      <div class="picker-header">
        <span>选择被替换班次</span>
      </div>
      <div class="shift-options">
        <van-button
          v-for="type in shiftTypes"
          :key="type.id"
          class="shift-option"
          :style="{ background: type.color, color: '#fff' }"
          @click="setReplacedShiftType(type.id)"
        >
          {{ type.name }}
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import {
  getScheduleTemplates,
  getScheduleTemplate,
  createScheduleTemplate,
  updateScheduleTemplate,
  deleteScheduleTemplate,
} from '@/api/scheduleTemplate'
import { getUsers } from '@/api/user'
import { getShiftTypes } from '@/api/shiftType'
import { withLoading } from '@/utils/loading'

const templates = ref<any[]>([])
const users = ref<any[]>([])
const shiftTypes = ref<any[]>([])
const showPopup = ref(false)
const showTypePicker = ref(false)
const showShiftPicker = ref(false)
const showReplacePicker = ref(false)
const showReplacedPicker = ref(false)
const editing = ref(false)
const currentTemplateId = ref<number | null>(null)
const pickerUserId = ref<number | null>(null)
const pickerDay = ref<string>('')

const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const dayLabels: Record<string, string> = {
  monday: '周一',
  tuesday: '周二',
  wednesday: '周三',
  thursday: '周四',
  friday: '周五',
  saturday: '周六',
  sunday: '周日',
}

const typeColumns = [
  { text: '固定模板', value: 1 },
  { text: '随机模板', value: 2 },
]

const form = reactive({
  id: 0,
  name: '',
  templateType: 1,
  replaceShiftTypeId: null as number | null,
  replacedShiftTypeId: null as number | null,
  targetUserIds: [] as number[],
  items: new Map<number, Record<string, number | null>>(),
})

const pickerUser = computed(() => {
  return users.value.find((u: any) => Number(u.id) === pickerUserId.value)
})

const pickerDayLabel = computed(() => {
  return dayLabels[pickerDay.value] || ''
})

const typeIndex = computed(() => {
  return typeColumns.findIndex((c) => c.value === form.templateType)
})

const loadTemplates = async () => {
  const res = await getScheduleTemplates()
  templates.value = res || []
}

const loadUsers = async () => {
  const res = await getUsers()
  users.value = (res.list || []).filter((u: any) => u.status === 1 && !u.isAdmin)
}

const loadShiftTypes = async () => {
  const list = await getShiftTypes()
  shiftTypes.value = (list || []).filter((t: any) => t.status === 1)
}

const templateTypeText = (type?: number) => {
  return type === 2 ? '随机模板' : '固定模板'
}

const shiftTypeName = (id: number | null) => {
  if (!id) return ''
  const type = shiftTypes.value.find((t: any) => t.id === id)
  return type?.name || ''
}

const getShift = (userId: number, day: string) => {
  return form.items.get(userId)?.[day] ?? null
}

const cellText = (shiftTypeId: number | null) => {
  if (!shiftTypeId) return ''
  const type = shiftTypes.value.find((t: any) => t.id === shiftTypeId)
  return type?.code || type?.name || '班'
}

const cellStyle = (shiftTypeId: number | null) => {
  if (!shiftTypeId) return {}
  const type = shiftTypes.value.find((t: any) => t.id === shiftTypeId)
  return {
    backgroundColor: type?.color || '#E0E0E0',
    color: '#fff',
  }
}

const resetForm = () => {
  form.id = 0
  form.name = ''
  form.templateType = 1
  form.replaceShiftTypeId = null
  form.replacedShiftTypeId = null
  form.targetUserIds = []
  form.items = new Map()
  for (const user of users.value) {
    form.items.set(Number(user.id), {})
  }
}

const create = () => {
  editing.value = false
  currentTemplateId.value = null
  resetForm()
  showPopup.value = true
}

const edit = async (template: any) => {
  editing.value = true
  currentTemplateId.value = Number(template.id)
  const detail = await getScheduleTemplate(template.id)
  form.id = Number(detail.id)
  form.name = detail.name
  form.templateType = detail.templateType ?? 1
  form.replaceShiftTypeId = detail.replaceShiftTypeId ?? null
  form.replacedShiftTypeId = detail.replacedShiftTypeId ?? null
  form.targetUserIds = (detail.targetUserIds || []).map((id: any) => Number(id))
  form.items = new Map()
  for (const user of users.value) {
    form.items.set(Number(user.id), {})
  }
  for (const item of detail.items || []) {
    const days: Record<string, number | null> = {}
    for (const day of dayKeys) {
      days[day] = item[day] ?? null
    }
    form.items.set(Number(item.userId), days)
  }
  showPopup.value = true
}

const onTypeSelect = ({ selectedOptions }: any) => {
  form.templateType = selectedOptions[0].value
  showTypePicker.value = false
}

const openShiftPicker = (userId: number, day: string) => {
  pickerUserId.value = userId
  pickerDay.value = day
  showShiftPicker.value = true
}

const openReplacePicker = () => {
  showReplacePicker.value = true
}

const openReplacedPicker = () => {
  showReplacedPicker.value = true
}

const setShift = (shiftTypeId: number | null) => {
  if (!pickerUserId.value || !pickerDay.value) return
  const days = form.items.get(pickerUserId.value) || {}
  days[pickerDay.value] = shiftTypeId
  form.items.set(pickerUserId.value, days)
  showShiftPicker.value = false
}

const setReplaceShiftType = (shiftTypeId: number) => {
  form.replaceShiftTypeId = shiftTypeId
  showReplacePicker.value = false
}

const setReplacedShiftType = (shiftTypeId: number) => {
  form.replacedShiftTypeId = shiftTypeId
  showReplacedPicker.value = false
}

const selectAllUsers = () => {
  form.targetUserIds = users.value.map((u: any) => Number(u.id))
}

const clearAllUsers = () => {
  form.targetUserIds = []
}

const buildItems = () => {
  const items: any[] = []
  for (const [userId, days] of form.items.entries()) {
    const hasValue = dayKeys.some((day) => days[day] !== undefined && days[day] !== null)
    if (!hasValue) continue
    const item: any = { userId }
    for (const day of dayKeys) {
      if (days[day] !== undefined && days[day] !== null) {
        item[day] = days[day]
      }
    }
    items.push(item)
  }
  return items
}

const onSubmit = async () => {
  const payload: any = {
    name: form.name,
    templateType: form.templateType,
  }
  if (form.templateType === 2) {
    payload.replaceShiftTypeId = form.replaceShiftTypeId
    payload.replacedShiftTypeId = form.replacedShiftTypeId
    payload.targetUserIds = form.targetUserIds
  } else {
    payload.items = buildItems()
  }

  if (editing.value) {
    await withLoading(() => updateScheduleTemplate(form.id, payload))
  } else {
    await withLoading(() => createScheduleTemplate(payload))
  }
  showToast('保存成功')
  showPopup.value = false
  loadTemplates()
}

const toggleStatus = async (template: any, active: boolean) => {
  await withLoading(() =>
    updateScheduleTemplate(Number(template.id), { status: active ? 1 : 0 }),
  )
  showToast(active ? '已启用' : '已停用')
  loadTemplates()
}

const remove = async () => {
  if (!currentTemplateId.value) return
  await showConfirmDialog({
    title: '确认删除',
    message: '删除后无法恢复，是否继续？',
  })
  await withLoading(() => deleteScheduleTemplate(currentTemplateId.value!), '删除中...')
  showToast('删除成功')
  showPopup.value = false
  loadTemplates()
}

onMounted(() => {
  loadTemplates()
  loadUsers()
  loadShiftTypes()
})
</script>

<style scoped>
.schedule-templates {
  padding: 12px;
}

.toolbar {
  margin-bottom: 12px;
}

.form-wrap {
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}

.form-wrap h3 {
  text-align: center;
  margin-bottom: 16px;
}

.table-wrap {
  flex: 1;
  overflow: auto;
  margin: 12px 0;
}

.template-table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  min-width: 600px;
}

.template-table th,
.template-table td {
  border: 1px solid #e0e0e0;
  text-align: center;
  padding: 6px 2px;
  font-size: 12px;
}

.template-table th {
  background: #fafafa;
  font-weight: bold;
}

.name-col {
  width: 70px;
  min-width: 70px;
  position: sticky;
  left: 0;
  background: #fafafa;
  z-index: 1;
}

.shift-cell {
  width: 50px;
  min-width: 50px;
  height: 36px;
  cursor: pointer;
  font-weight: bold;
}

.shift-cell:active {
  opacity: 0.7;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  font-size: 15px;
  font-weight: bold;
}

.shift-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 0 16px 24px;
}

.shift-option {
  min-width: 80px;
  border: 1px solid transparent;
}

.user-group {
  margin-top: 12px;
}

.user-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 12px;
  font-size: 14px;
  color: #666;
  font-weight: bold;
}

.user-group-actions {
  display: flex;
  gap: 8px;
}

.user-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0 16px 16px;
}

.user-checkbox {
  margin: 0;
  padding: 6px 12px;
  background: #f5f5f5;
  border-radius: 16px;
  border: 1px solid #e0e0e0;
}

.user-checkbox :deep(.van-checkbox__label) {
  margin-left: 6px;
  color: #333;
  line-height: 20px;
}

.user-checkbox :deep(.van-checkbox__icon) {
  font-size: 14px;
}
</style>
