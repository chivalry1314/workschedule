<template>
  <div class="swaps">
    <van-tabs v-model:active="activeTab">
      <van-tab title="我发起的">
        <div class="list">
          <van-empty v-if="applied.length === 0" description="暂无发起的申请" />
          <div v-else class="card-list">
            <div v-for="s in applied" :key="s.id" class="swap-card">
              <div class="card-header">
                <span class="card-title">与 {{ s.targetUser?.realName || '对方' }} 换班</span>
                <van-tag :type="statusTagType(s.status)">{{ statusText(s.status) }}</van-tag>
              </div>
              <div class="swap-detail">
                <div class="party-row">
                  <span class="party-label">我方</span>
                  <span class="party-date">{{ formatDate(s.applicantSchedule?.workDate) }}</span>
                  <van-tag
                    v-if="s.applicantSchedule?.shiftType"
                    :color="s.applicantSchedule.shiftType.color"
                    text-color="#fff"
                    class="shift-tag"
                  >{{ s.applicantSchedule.shiftType.name }}</van-tag>
                </div>
                <div class="exchange-line">
                  <van-icon name="exchange" />
                </div>
                <div class="party-row">
                  <span class="party-label">对方</span>
                  <span class="party-date">{{ formatDate(s.targetSchedule?.workDate) }}</span>
                  <van-tag
                    v-if="s.targetSchedule?.shiftType"
                    :color="s.targetSchedule.shiftType.color"
                    text-color="#fff"
                    class="shift-tag"
                  >{{ s.targetSchedule.shiftType.name }}</van-tag>
                </div>
              </div>
              <div class="card-footer">
                <span class="reason">原因：{{ s.reason || '无' }}</span>
                <span class="apply-time">申请于 {{ formatDateTime(s.createdAt) }}</span>
              </div>
              <div v-if="s.status === 0 || s.status === 4" class="actions">
                <van-button size="small" type="warning" @click="withdraw(s.id)">撤回申请</van-button>
              </div>
            </div>
          </div>
        </div>
      </van-tab>
      <van-tab title="我收到的">
        <div class="list">
          <van-empty v-if="received.length === 0" description="暂无收到的申请" />
          <div v-else class="card-list">
            <div v-for="s in received" :key="s.id" class="swap-card">
              <div class="card-header">
                <span class="card-title">{{ s.applicant?.realName || '对方' }} 申请与我换班</span>
                <van-tag :type="statusTagType(s.status)">{{ statusText(s.status) }}</van-tag>
              </div>
              <div class="swap-detail">
                <div class="party-row">
                  <span class="party-label">对方</span>
                  <span class="party-date">{{ formatDate(s.applicantSchedule?.workDate) }}</span>
                  <van-tag
                    v-if="s.applicantSchedule?.shiftType"
                    :color="s.applicantSchedule.shiftType.color"
                    text-color="#fff"
                    class="shift-tag"
                  >{{ s.applicantSchedule.shiftType.name }}</van-tag>
                </div>
                <div class="exchange-line">
                  <van-icon name="exchange" />
                </div>
                <div class="party-row">
                  <span class="party-label">我方</span>
                  <span class="party-date">{{ formatDate(s.targetSchedule?.workDate) }}</span>
                  <van-tag
                    v-if="s.targetSchedule?.shiftType"
                    :color="s.targetSchedule.shiftType.color"
                    text-color="#fff"
                    class="shift-tag"
                  >{{ s.targetSchedule.shiftType.name }}</van-tag>
                </div>
              </div>
              <div class="card-footer">
                <span class="reason">原因：{{ s.reason || '无' }}</span>
                <span class="apply-time">申请于 {{ formatDateTime(s.createdAt) }}</span>
              </div>
              <div class="actions">
                <van-button size="small" type="primary" @click="approve(s.id)">同意</van-button>
                <van-button size="small" type="danger" @click="reject(s.id)">拒绝</van-button>
              </div>
            </div>
          </div>
        </div>
      </van-tab>
    </van-tabs>

    <div class="fab-wrap">
      <van-button round type="primary" icon="plus" @click="openCreate">发起换班</van-button>
    </div>

    <van-popup v-model:show="showCreate" position="bottom" round :style="{ height: '70%' }">
      <div class="create-form">
        <h3>发起换班</h3>
        <van-field
          label="我的日期"
          is-link
          readonly
          :model-value="selectedDateText"
          placeholder="请选择要换班的日期"
          @click="openCalendar"
        />
        <van-field
          label="被换班人员"
          is-link
          readonly
          :model-value="targetUserName"
          placeholder="请选择被换班的人员"
          @click="openTargetUserPicker"
        />
        <van-field
          label="被换班日期"
          is-link
          readonly
          :model-value="targetDateText"
          placeholder="请先选择被换班人员"
          @click="openTargetCalendar"
        />
        <van-field
          v-model="form.reason"
          label="原因"
          type="textarea"
          rows="2"
          placeholder="请输入换班原因（可选）"
        />
        <van-button round block type="primary" @click="submitSwap">提交申请</van-button>
      </div>
    </van-popup>

    <van-popup v-model:show="showCalendarPicker" position="bottom" round :style="{ height: '75%' }">
      <div class="calendar-wrap">
        <div class="month-selector">
          <van-button size="small" icon="arrow-left" @click="changeCalendarMonth(-1)" />
          <span class="month-text">{{ calendarYear }}年{{ calendarMonth }}月</span>
          <van-button size="small" icon="arrow" @click="changeCalendarMonth(1)" />
        </div>
        <div class="calendar">
          <div class="week-header">
            <span v-for="day in weekDays" :key="day">{{ day }}</span>
          </div>
          <div class="days-grid">
            <div
              v-for="day in calendarDays"
              :key="day.date || day.index"
              class="day-cell"
              :class="{ empty: !day.date, selected: day.date === selectedDate }"
              :style="dayStyle(day)"
              @click="day.date && selectCalendarDay(day)"
            >
              <div class="day-number">{{ day.dayOfMonth || '' }}</div>
              <div class="shift-name">{{ day.shiftName || '' }}</div>
            </div>
          </div>
        </div>
        <div class="calendar-tip">请选择已排班的日期</div>
      </div>
    </van-popup>

    <van-popup v-model:show="showTargetUserPicker" position="bottom" round :style="{ height: '40%' }">
      <div class="picker-wrap">
        <div class="picker-header">
          <span>选择被换班人员</span>
          <van-button size="small" @click="showTargetUserPicker = false">关闭</van-button>
        </div>
        <van-picker
          :columns="targetUserColumns"
          :default-index="targetUserDefaultIndex"
          @confirm="onTargetUserSelect"
          @cancel="showTargetUserPicker = false"
        />
      </div>
    </van-popup>

    <van-popup v-model:show="showTargetCalendarPicker" position="bottom" round :style="{ height: '75%' }">
      <div class="calendar-wrap">
        <div class="month-selector">
          <van-button size="small" icon="arrow-left" @click="changeTargetCalendarMonth(-1)" />
          <span class="month-text">{{ targetCalendarYear }}年{{ targetCalendarMonth }}月</span>
          <van-button size="small" icon="arrow" @click="changeTargetCalendarMonth(1)" />
        </div>
        <div class="calendar">
          <div class="week-header">
            <span v-for="day in weekDays" :key="day">{{ day }}</span>
          </div>
          <div class="days-grid">
            <div
              v-for="day in targetCalendarDays"
              :key="day.date || day.index"
              class="day-cell"
              :class="{ empty: !day.date, selected: day.date === targetSelectedDate }"
              :style="targetDayStyle(day)"
              @click="day.date && selectTargetCalendarDay(day)"
            >
              <div class="day-number">{{ day.dayOfMonth || '' }}</div>
              <div class="shift-name">{{ day.shiftName || '' }}</div>
            </div>
          </div>
        </div>
        <div class="calendar-tip">请选择对方已排班的日期</div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { useUserStore } from '@/stores/user'
import { getSwaps, createSwap, approveSwap, rejectSwap, withdrawSwap } from '@/api/swap'
import { getMySchedules, getAllSchedules, getUserSchedules } from '@/api/schedule'
import { withLoading } from '@/utils/loading'

const userStore = useUserStore()
const activeTab = ref(0)
const applied = ref<any[]>([])
const received = ref<any[]>([])
const showCreate = ref(false)
const showCalendarPicker = ref(false)
const showTargetUserPicker = ref(false)
const showTargetCalendarPicker = ref(false)

const form = ref({
  reason: '',
  applicantScheduleId: 0,
  targetUserId: 0,
  targetScheduleId: 0,
  swapType: 1,
})

const now = new Date()
const calendarYear = ref(now.getFullYear())
const calendarMonth = ref(now.getMonth() + 1)
const calendarSchedules = ref<Record<string, any>>({})
const selectedDate = ref('')

const targetUsers = ref<any[]>([])
const targetUserId = ref(0)
const targetCalendarYear = ref(now.getFullYear())
const targetCalendarMonth = ref(now.getMonth() + 1)
const targetCalendarSchedules = ref<Record<string, any>>({})
const targetSelectedDate = ref('')

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const selectedDateText = computed(() => {
  if (!selectedDate.value || !calendarSchedules.value[selectedDate.value]) {
    return ''
  }
  const s = calendarSchedules.value[selectedDate.value]
  return s.shiftType ? `${formatDate(s.workDate)} ${s.shiftType.name}` : ''
})

const targetUserName = computed(() => {
  const user = targetUsers.value.find((u: any) => Number(u.id) === targetUserId.value)
  return user?.realName || '请选择'
})

const targetUserColumns = computed(() => {
  return targetUsers.value.map((u: any) => ({ text: u.realName, value: Number(u.id) }))
})

const targetUserDefaultIndex = computed(() => {
  return targetUserColumns.value.findIndex((c: any) => c.value === targetUserId.value)
})

const targetDateText = computed(() => {
  if (!targetSelectedDate.value || !targetCalendarSchedules.value[targetSelectedDate.value]) {
    return ''
  }
  const s = targetCalendarSchedules.value[targetSelectedDate.value]
  return s.shiftType ? `${formatDate(s.workDate)} ${s.shiftType.name}` : ''
})

const calendarDays = computed(() => {
  return buildDays(calendarYear.value, calendarMonth.value, calendarSchedules.value)
})

const targetCalendarDays = computed(() => {
  return buildDays(targetCalendarYear.value, targetCalendarMonth.value, targetCalendarSchedules.value)
})

const buildDays = (year: number, month: number, schedules: Record<string, any>) => {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = firstDay.getDay()
  const result: any[] = []
  for (let i = 0; i < startWeekday; i++) {
    result.push({ index: `empty-${i}`, date: '', dayOfMonth: 0 })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const s = schedules[date]
    result.push({
      date,
      dayOfMonth: i,
      shiftName: s?.shiftType?.name || '',
      shiftType: s?.shiftType || null,
      schedule: s || null,
    })
  }
  return result
}

const dayStyle = (day: any) => {
  if (!day.shiftType) {
    return {}
  }
  return {
    backgroundColor: day.shiftType.color + '20',
    borderColor: day.shiftType.color,
  }
}

const targetDayStyle = (day: any) => {
  if (!day.shiftType) {
    return {}
  }
  return {
    backgroundColor: day.shiftType.color + '20',
    borderColor: day.shiftType.color,
  }
}

const loadData = async () => {
  const res = await getSwaps()
  applied.value = res.applied || []
  received.value = res.received || []
}

const loadCalendarSchedules = async () => {
  const res = await getMySchedules(calendarYear.value, calendarMonth.value)
  calendarSchedules.value = (res.schedules || []).reduce((acc: any, s: any) => {
    const d = new Date(s.workDate).toISOString().split('T')[0]
    acc[d] = s
    return acc
  }, {})
}

const loadTargetUsers = async () => {
  const res = await getAllSchedules(calendarYear.value, calendarMonth.value)
  const currentId = Number(userStore.userInfo?.id)
  targetUsers.value = (res.users || []).filter((u: any) => Number(u.id) !== currentId)
}

const loadTargetCalendarSchedules = async () => {
  if (!targetUserId.value) return
  const res = await getUserSchedules(targetUserId.value, targetCalendarYear.value, targetCalendarMonth.value)
  targetCalendarSchedules.value = (res.schedules || []).reduce((acc: any, s: any) => {
    const d = new Date(s.workDate).toISOString().split('T')[0]
    acc[d] = s
    return acc
  }, {})
}

const openCreate = () => {
  form.value = { reason: '', applicantScheduleId: 0, targetUserId: 0, targetScheduleId: 0, swapType: 1 }
  selectedDate.value = ''
  targetUserId.value = 0
  targetSelectedDate.value = ''
  const d = new Date()
  calendarYear.value = d.getFullYear()
  calendarMonth.value = d.getMonth() + 1
  targetCalendarYear.value = d.getFullYear()
  targetCalendarMonth.value = d.getMonth() + 1
  loadCalendarSchedules()
  loadTargetUsers()
  showCreate.value = true
}

const openCalendar = () => {
  loadCalendarSchedules()
  showCalendarPicker.value = true
}

const changeCalendarMonth = async (delta: number) => {
  const d = new Date(calendarYear.value, calendarMonth.value - 1 + delta, 1)
  calendarYear.value = d.getFullYear()
  calendarMonth.value = d.getMonth() + 1
  await loadCalendarSchedules()
}

const selectCalendarDay = (day: any) => {
  if (!day.schedule || !day.schedule.shiftType) {
    showToast('该日期没有排班，请选择已排班的日期')
    return
  }
  selectedDate.value = day.date
  form.value.applicantScheduleId = Number(day.schedule.id)
  showCalendarPicker.value = false
}

const openTargetUserPicker = () => {
  showTargetUserPicker.value = true
}

const onTargetUserSelect = ({ selectedOptions }: any) => {
  targetUserId.value = selectedOptions[0].value
  form.value.targetUserId = targetUserId.value
  form.value.targetScheduleId = 0
  targetSelectedDate.value = ''
  showTargetUserPicker.value = false
}

const openTargetCalendar = () => {
  if (!targetUserId.value) {
    showToast('请先选择被换班人员')
    return
  }
  loadTargetCalendarSchedules()
  showTargetCalendarPicker.value = true
}

const changeTargetCalendarMonth = async (delta: number) => {
  const d = new Date(targetCalendarYear.value, targetCalendarMonth.value - 1 + delta, 1)
  targetCalendarYear.value = d.getFullYear()
  targetCalendarMonth.value = d.getMonth() + 1
  await loadTargetCalendarSchedules()
}

const selectTargetCalendarDay = (day: any) => {
  if (!day.schedule || !day.schedule.shiftType) {
    showToast('该日期对方没有排班，请选择对方已排班的日期')
    return
  }
  targetSelectedDate.value = day.date
  form.value.targetScheduleId = Number(day.schedule.id)
  form.value.targetUserId = targetUserId.value
  showTargetCalendarPicker.value = false
}

const statusText = (status: number) => {
  const map: Record<number, string> = {
    0: '待处理',
    1: '同意',
    2: '拒绝',
    3: '撤回',
    4: '管理员审批中',
    5: '已完成',
  }
  return map[status] || '未知'
}

const statusTagType = (status: number) => {
  const map: Record<number, 'primary' | 'success' | 'warning' | 'danger' | 'default'> = {
    0: 'warning',
    1: 'primary',
    2: 'danger',
    3: 'default',
    4: 'warning',
    5: 'success',
  }
  return map[status] || 'default'
}

const formatDate = (d: string) => {
  if (!d) return '-'
  return new Date(d).toISOString().split('T')[0]
}

const formatDateTime = (d: string) => {
  if (!d) return '-'
  const date = new Date(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const submitSwap = async () => {
  if (!form.value.applicantScheduleId) {
    showToast('请选择要换班的日期')
    return
  }
  if (!form.value.targetUserId) {
    showToast('请选择被换班的人员')
    return
  }
  if (!form.value.targetScheduleId) {
    showToast('请选择被换班的日期')
    return
  }
  await withLoading(() =>
    createSwap({
      applicantScheduleId: form.value.applicantScheduleId,
      targetUserId: form.value.targetUserId,
      targetScheduleId: form.value.targetScheduleId,
      swapType: 1,
      reason: form.value.reason,
    }),
    '提交中...',
  )
  showToast('申请已发起')
  showCreate.value = false
  loadData()
}

const approve = async (id: number) => {
  await withLoading(() => approveSwap(id), '处理中...')
  showToast('已同意')
  loadData()
}

const reject = async (id: number) => {
  await withLoading(() => rejectSwap(id), '处理中...')
  showToast('已拒绝')
  loadData()
}

const withdraw = async (id: number) => {
  await showConfirmDialog({ title: '确认撤回', message: '撤回后该换班申请将失效，是否继续？' })
  await withLoading(() => withdrawSwap(id), '撤回中...')
  showToast('已撤回')
  loadData()
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.swaps {
  padding-bottom: 80px;
}

.list {
  padding: 12px;
}

.card-list {
  padding: 12px;
}

.swap-card {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-title {
  font-size: 15px;
  font-weight: bold;
  color: #323233;
}

.swap-detail {
  background: #f7f8fa;
  border-radius: 8px;
  padding: 10px 12px;
}

.party-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.party-label {
  flex-shrink: 0;
  width: 36px;
  color: #969799;
  font-size: 13px;
}

.party-date {
  font-weight: bold;
  color: #323233;
}

.shift-tag {
  flex-shrink: 0;
  margin-left: auto;
}

.exchange-line {
  display: flex;
  justify-content: center;
  color: #c8c9cc;
  font-size: 16px;
  padding: 4px 0;
}

.card-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.reason {
  font-size: 13px;
  color: #646566;
  word-break: break-all;
}

.apply-time {
  flex-shrink: 0;
  font-size: 12px;
  color: #c8c9cc;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  justify-content: flex-end;
}

.fab-wrap {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.create-form {
  padding: 16px;
}

.create-form h3 {
  text-align: center;
  margin-bottom: 16px;
}

.calendar-wrap {
  padding: 12px;
}

.month-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.month-text {
  font-size: 18px;
  font-weight: bold;
}

.calendar {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  text-align: center;
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 14px;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.day-cell {
  height: 52px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-sizing: border-box;
}

.day-cell.empty {
  border: none;
  pointer-events: none;
}

.day-cell.selected {
  border-width: 2px;
  border-color: #1989fa;
  box-shadow: 0 0 0 2px rgba(25, 137, 250, 0.2);
}

.day-number {
  font-size: 14px;
  font-weight: bold;
}

.shift-name {
  font-size: 12px;
  margin-top: 2px;
}

.calendar-tip {
  text-align: center;
  color: #999;
  font-size: 13px;
  margin-top: 12px;
}

.picker-wrap {
  padding: 16px;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
</style>
