<template>
  <div class="all-schedule">
    <div class="month-selector">
      <van-button size="small" icon="arrow-left" @click="changeMonth(-1)" />
      <span class="month-text">{{ year }}年{{ month }}月</span>
      <van-button size="small" icon="arrow" @click="changeMonth(1)" />
    </div>

    <div v-if="isAdmin" class="export-bar">
      <van-button size="small" type="primary" icon="down" @click="exportExcel">导出 Excel</van-button>
    </div>

    <div class="table-wrapper">
      <table v-if="userList.length > 0" class="schedule-table">
        <thead>
          <tr>
            <th class="corner-cell">日期</th>
            <th
              v-for="user in userList"
              :key="user.id"
              class="name-header"
            >
              {{ user.realName }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="day in days"
            :key="day.date"
            :class="{ weekend: day.isWeekend }"
          >
            <td
              class="sticky-cell day-cell"
              :class="{ weekend: day.isWeekend }"
            >
              <div class="day-number">{{ day.dayOfMonth }}</div>
              <div class="day-week">{{ day.weekText }}</div>
            </td>
            <td
              v-for="user in userList"
              :key="user.id"
              class="shift-cell"
              :class="{ clickable: isAdmin }"
              :style="cellStyle(matrix[day.date][user.id])"
              @click="isAdmin && onCellClick(day, user)"
            >
              {{ cellText(matrix[day.date][user.id]) }}
            </td>
          </tr>
        </tbody>
      </table>
      <van-empty v-else description="暂无排班数据" />
    </div>

    <van-popup v-model:show="showPicker" position="bottom" round>
      <div class="picker-header">
        <span>{{ pickerUser?.realName }} · {{ pickerDay?.date }}</span>
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { showToast } from 'vant'
import * as XLSX from 'xlsx'
import { getAllSchedules, saveUserSchedules } from '@/api/schedule'
import { getShiftTypes } from '@/api/shiftType'
import { useUserStore } from '@/stores/user'
import { withLoading } from '@/utils/loading'

const userStore = useUserStore()
const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const grouped = ref<Record<string, any[]>>({})
const users = ref<any[]>([])

const isAdmin = computed(() => userStore.isAdmin)
const showPicker = ref(false)
const pickerDay = ref<DayInfo | null>(null)
const pickerUser = ref<any>(null)
const shiftTypes = ref<any[]>([])

interface DayInfo {
  date: string
  dayOfMonth: number
  weekText: string
  isWeekend: boolean
}

const weekTexts = ['日', '一', '二', '三', '四', '五', '六']

const days = computed<DayInfo[]>(() => {
  const list: DayInfo[] = []
  const lastDay = new Date(year.value, month.value, 0).getDate()
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year.value}-${String(month.value).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayOfWeek = new Date(year.value, month.value - 1, d).getDay()
    list.push({
      date: dateStr,
      dayOfMonth: d,
      weekText: weekTexts[dayOfWeek],
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    })
  }
  return list
})

const userList = computed(() => {
  return users.value.slice().sort((a, b) => a.id - b.id)
})

const matrix = computed(() => {
  const m: Record<string, Record<number, any>> = {}
  days.value.forEach((day) => {
    m[day.date] = {}
    userList.value.forEach((user) => {
      m[day.date][user.id] = null
    })
  })

  Object.entries(grouped.value).forEach(([date, items]) => {
    items.forEach((item) => {
      if (item.user && m[date]) {
        m[date][item.user.id] = item.shiftType
      }
    })
  })

  return m
})

const cellText = (shiftType: any) => {
  if (!shiftType) return ''
  return shiftType.code || shiftType.name || '班'
}

const cellStyle = (shiftType: any) => {
  if (!shiftType) {
    return {}
  }
  return {
    backgroundColor: shiftType.color || '#E0E0E0',
    color: '#fff',
  }
}

const loadData = async () => {
  const res = await getAllSchedules(year.value, month.value)
  users.value = res.users || []
  grouped.value = res.grouped || {}
}

const changeMonth = (delta: number) => {
  const d = new Date(year.value, month.value - 1 + delta, 1)
  year.value = d.getFullYear()
  month.value = d.getMonth() + 1
  loadData()
}

const ensureShiftTypes = async () => {
  if (shiftTypes.value.length > 0) return
  const list = await getShiftTypes()
  shiftTypes.value = (list || []).filter((t: any) => t.status === 1)
}

const onCellClick = async (day: DayInfo, user: any) => {
  pickerDay.value = day
  pickerUser.value = user
  await ensureShiftTypes()
  showPicker.value = true
}

const setShift = async (shiftTypeId: number | null) => {
  if (!pickerDay.value || !pickerUser.value) return
  await withLoading(() =>
    saveUserSchedules(pickerUser.value.id, {
      year: year.value,
      month: month.value,
      items: [{ workDate: pickerDay.value!.date, shiftTypeId }],
    }),
  )
  showToast('保存成功')
  showPicker.value = false
  await loadData()
}

// 导出当前月的总排班为 Excel：日期在横轴（列），姓名在纵轴（行）
const exportExcel = () => {
  if (userList.value.length === 0) {
    showToast('暂无排班数据可导出')
    return
  }
  const header = ['姓名', ...days.value.map((d) => `${d.dayOfMonth}日 周${d.weekText}`)]
  const rows = userList.value.map((user) => [
    user.realName,
    ...days.value.map((d) => cellText(matrix.value[d.date][user.id])),
  ])
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows])
  // 姓名列宽一点，日期列自适应
  sheet['!cols'] = [{ wch: 12 }, ...days.value.map(() => ({ wch: 10 }))]
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, `${month.value}月排班`)
  XLSX.writeFile(book, `排班表-${year.value}-${String(month.value).padStart(2, '0')}.xlsx`)
}

watch(() => [year.value, month.value], loadData, { immediate: true })
</script>

<style scoped>
.all-schedule {
  padding: 12px;
  background: #f5f5f5;
  min-height: 100vh;
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

.export-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.table-wrapper {
  overflow-x: auto;
  overflow-y: visible;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.schedule-table {
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 100%;
}

.schedule-table th,
.schedule-table td {
  border: 1px solid #e0e0e0;
  text-align: center;
  vertical-align: middle;
  box-sizing: border-box;
}

.corner-cell {
  width: 70px;
  min-width: 70px;
  position: sticky;
  top: 0;
  left: 0;
  z-index: 2;
  background-color: #f5f5f5;
  font-weight: bold;
  font-size: 13px;
}

.name-header {
  width: 70px;
  min-width: 70px;
  padding: 8px 4px;
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: #fafafa;
  font-size: 13px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.day-cell {
  width: 70px;
  min-width: 70px;
  padding: 6px 2px;
  position: sticky;
  left: 0;
  z-index: 1;
  background-color: #fafafa;
  font-size: 12px;
}

.day-cell .day-number {
  font-weight: bold;
  margin-bottom: 2px;
}

.day-cell .day-week {
  font-size: 11px;
  color: #666;
}

.shift-cell {
  width: 70px;
  min-width: 70px;
  height: 40px;
  font-size: 13px;
  font-weight: bold;
  padding: 4px;
}

.shift-cell.clickable {
  cursor: pointer;
}

.shift-cell.clickable:active {
  opacity: 0.6;
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
  border: none;
}

.day-cell.weekend,
tr.weekend .day-cell {
  background-color: #FFCDD2;
}

tr.weekend .shift-cell {
  border-left-color: #ef9a9a;
  border-right-color: #ef9a9a;
}

tr.weekend:last-child .shift-cell {
  border-bottom-color: #ef9a9a;
}
</style>
