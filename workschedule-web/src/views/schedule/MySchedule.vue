<template>
  <div class="my-schedule">
    <template v-if="showUserList">
      <div class="page-header">选择人员查看排班</div>
      <div class="user-list">
        <div
          v-for="user in nonAdminUsers"
          :key="user.id"
          class="user-card"
          @click="enterUser(user.id)"
        >
          <span class="user-name">{{ user.realName }}</span>
          <van-icon name="arrow" />
        </div>
      </div>
      <van-empty v-if="nonAdminUsers.length === 0" description="暂无可管理的非管理员人员" />
    </template>

    <template v-else>
      <div class="schedule-header">
        <van-button
          v-if="isAdmin"
          size="small"
          icon="arrow-left"
          @click="backToUserList"
        >
          返回
        </van-button>
        <span class="schedule-title">{{ pageTitle }}</span>
      </div>

      <div class="month-selector">
        <van-button size="small" icon="arrow-left" @click="changeMonth(-1)" />
        <span class="month-text">{{ year }}年{{ month }}月</span>
        <van-button size="small" icon="arrow" @click="changeMonth(1)" />
      </div>

      <div class="status-bar">
        <van-tag :type="statusType">{{ statusLabel }}</van-tag>
        <van-button
          v-if="isViewingOthers"
          size="small"
          type="danger"
          @click="clearMonth"
        >
          清除本月排班
        </van-button>
      </div>

      <div class="calendar">
        <div class="week-header">
          <span v-for="day in weekDays" :key="day">{{ day }}</span>
        </div>
        <div class="days-grid">
          <div
            v-for="day in days"
            :key="day.date"
            class="day-cell"
            :class="{ empty: !day.date, today: day.isToday, selected: day.date === selectedDate }"
            :style="dayStyle(day)"
            @click="day.date && selectDate(day)"
          >
            <div class="day-number">{{ day.dayOfMonth || '' }}</div>
            <div class="shift-name">{{ day.shiftName || '' }}</div>
          </div>
        </div>
      </div>

      <van-popup v-model:show="showPicker" position="bottom" round>
        <div class="picker-header">
          <span>{{ selectedDate }} 值班选择</span>
          <van-button size="small" type="danger" @click="clearShift">清空</van-button>
        </div>
        <div class="shift-options">
          <van-button
            v-for="type in allowedShiftTypes"
            :key="type.id"
            class="shift-option"
            :style="{ background: type.color, color: '#fff' }"
            @click="setShift(type.id)"
          >
            {{ type.name }}
          </van-button>
        </div>
      </van-popup>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  getMySchedules,
  getUserSchedules,
  saveMySchedules,
  saveUserSchedules,
  clearUserSchedules,
} from '@/api/schedule'
import { getShiftTypes } from '@/api/shiftType'
import { getUsers } from '@/api/user'
import { getDefaultScheduleMonth } from '@/api/settings'
import { withLoading } from '@/utils/loading'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const schedules = ref<Record<string, any>>({})
const monthStatus = ref(0)
const selectedDate = ref('')
const showPicker = ref(false)
const editable = ref(true)
const lockReason = ref('')
const users = ref<any[]>([])
const allShiftTypes = ref<any[]>([])

const isAdmin = computed(() => userStore.isAdmin)
const viewUserId = computed(() => {
  const id = route.query.userId
  return id ? Number(id) : 0
})
const currentUserId = computed(() => userStore.userInfo?.id || 0)
const isViewingOthers = computed(
  () => isAdmin.value && viewUserId.value > 0 && viewUserId.value !== currentUserId.value,
)
const showUserList = computed(() => isAdmin.value && !route.query.userId)
const nonAdminUsers = computed(() => users.value.filter((u) => !u.isAdmin && u.status === 1))
const pageTitle = computed(() => {
  if (isViewingOthers.value) {
    const user = nonAdminUsers.value.find((u) => u.id === viewUserId.value)
    return `${user?.realName || '未知'}的排班`
  }
  return '我的排班'
})

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const statusLabel = computed(() => {
  if (!editable.value) return lockReason.value || '排班已锁定'
  const map: Record<number, string> = { 0: '可排班', 1: '已提交', 2: '已锁定' }
  return map[monthStatus.value] || '可排班'
})

const statusType = computed(() => {
  if (!editable.value) return 'warning'
  const map: Record<number, 'default' | 'success' | 'warning'> = {
    0: 'success',
    1: 'success',
    2: 'warning',
  }
  return map[monthStatus.value] || 'success'
})

const allowedShiftTypes = computed(() => {
  if (isViewingOthers.value) return allShiftTypes.value
  return userStore.userInfo?.role?.shiftTypes?.map((st: any) => st.shiftType) || []
})

const days = computed(() => {
  const firstDay = new Date(year.value, month.value - 1, 1)
  const lastDay = new Date(year.value, month.value, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = firstDay.getDay()
  const today = new Date().toISOString().split('T')[0]

  const result = []
  for (let i = 0; i < startWeekday; i++) {
    result.push({ date: '', dayOfMonth: 0, isToday: false })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const date = `${year.value}-${String(month.value).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    result.push({
      date,
      dayOfMonth: i,
      isToday: date === today,
      shiftName: schedules.value[date]?.shiftType?.name || '',
      shiftType: schedules.value[date]?.shiftType || null,
    })
  }
  return result
})

const dayStyle = (day: any) => {
  if (!day.shiftType) {
    return {}
  }
  return { backgroundColor: day.shiftType.color + '20', borderColor: day.shiftType.color }
}

const loadData = async () => {
  if (showUserList.value) return
  const res = isViewingOthers.value
    ? await getUserSchedules(viewUserId.value, year.value, month.value)
    : await getMySchedules(year.value, month.value)
  monthStatus.value = res.status
  editable.value = res.editable !== false
  lockReason.value = res.lockReason || ''
  schedules.value = res.schedules.reduce((acc: any, s: any) => {
    const d = new Date(s.workDate).toISOString().split('T')[0]
    acc[d] = s
    return acc
  }, {})
}

const loadUsers = async () => {
  if (!isAdmin.value) return
  const res = await getUsers()
  users.value = res.list || []
}

const loadAllShiftTypes = async () => {
  if (allShiftTypes.value.length > 0) return
  const list = await getShiftTypes()
  allShiftTypes.value = (list || []).filter((t: any) => t.status === 1)
}

const changeMonth = (delta: number) => {
  const d = new Date(year.value, month.value - 1 + delta, 1)
  year.value = d.getFullYear()
  month.value = d.getMonth() + 1
  loadData()
}

const selectDate = async (day: any) => {
  if (!isViewingOthers.value && !editable.value) {
    showToast(lockReason.value || '排班已锁定，不可修改')
    return
  }
  if (isViewingOthers.value) {
    await loadAllShiftTypes()
  }
  selectedDate.value = day.date
  showPicker.value = true
}

const setShift = async (shiftTypeId: number | null) => {
  if (!selectedDate.value) return
  const item = { workDate: selectedDate.value, shiftTypeId }
  if (isViewingOthers.value) {
    await withLoading(() =>
      saveUserSchedules(viewUserId.value, {
        year: year.value,
        month: month.value,
        items: [item],
      }),
    )
  } else {
    await withLoading(() =>
      saveMySchedules({ year: year.value, month: month.value, items: [item] }),
    )
  }
  showToast('保存成功')
  showPicker.value = false
  await loadData()
}

const clearShift = () => {
  setShift(null)
}

const enterUser = (id: number) => {
  router.replace({ query: { userId: String(id) } })
}

const backToUserList = () => {
  router.replace({ query: {} })
}

const clearMonth = async () => {
  await showConfirmDialog({
    title: '确认清除',
    message: `确定要清除 ${pageTitle.value.replace('的排班', '')} ${year.value}年${month.value}月的所有排班吗？此操作不可恢复。`,
  })
  await withLoading(
    () => clearUserSchedules(viewUserId.value, year.value, month.value),
    '清除中...',
  )
  showToast('已清除')
  await loadData()
}

const initDefaultMonth = async () => {
  if (showUserList.value) return
  const defaultMonth = await getDefaultScheduleMonth()
  if (defaultMonth) {
    year.value = defaultMonth.year
    month.value = defaultMonth.month
  }
  await loadData()
}

onMounted(() => {
  withLoading(async () => {
    await loadUsers()
    await initDefaultMonth()
  })
})

watch(() => [year.value, month.value], loadData)
watch(
  () => route.query.userId,
  async () => {
    if (isViewingOthers.value) {
      await initDefaultMonth()
    }
  },
)
</script>

<style scoped>
.my-schedule {
  padding: 12px;
}

.page-header {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
  color: #323233;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 14px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.user-name {
  font-size: 15px;
  color: #323233;
}

.schedule-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.schedule-title {
  font-size: 16px;
  font-weight: bold;
  color: #323233;
}

.month-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.month-text {
  font-size: 18px;
  font-weight: bold;
}

.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.calendar {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  text-align: center;
  font-weight: bold;
  margin-bottom: 8px;
  color: #666;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

.day-cell {
  height: 48px;
  border: 1px solid #eee;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  box-sizing: border-box;
}

.day-cell.empty {
  border-color: transparent;
}

.day-cell.today {
  border-color: #1989fa;
  font-weight: bold;
}

.day-cell.selected {
  border-color: #ff976a;
}

.shift-name {
  font-size: 10px;
  color: #333;
  transform: scale(0.9);
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
}

.shift-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px;
}

.shift-option {
  border-radius: 8px;
}
</style>
